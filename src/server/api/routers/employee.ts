import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { createTRPCRouter, roleProcedure } from "~/server/api/trpc";

const createEmployeeSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(7, "Phone number is required").optional(),
  dateOfJoining: z.string().min(1, "Joining date is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  departmentName: z.string().min(2, "Department is required"),
  designationName: z.string().min(2, "Designation is required"),
  role: z
    .enum(["HR_OFFICER", "PAYROLL_OFFICER", "EMPLOYEE"])
    .default("EMPLOYEE"),
});

const creatorRoles = ["ADMIN", "HR_OFFICER"] as const;

function initials(value: string) {
  return value
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 2)
    .toUpperCase()
    .padEnd(2, "X");
}

function makeTemporaryPassword() {
  const segment = Math.random().toString(36).slice(2, 8);
  return `EmPay@${segment.toUpperCase()}1`;
}

export const employeeRouter = createTRPCRouter({
  list: roleProcedure([...creatorRoles]).query(async ({ ctx }) => {
    return ctx.db.employee.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        phone: true,
        user: {
          select: {
            email: true,
            loginId: true,
            role: true,
            isActive: true,
            mustChangePassword: true,
          },
        },
        department: { select: { name: true } },
        designation: { select: { name: true } },
      },
    });
  }),

  create: roleProcedure([...creatorRoles])
    .input(createEmployeeSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role === "HR_OFFICER" && input.role !== "EMPLOYEE") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "HR officers can only create employee accounts",
        });
      }

      const existing = await ctx.db.user.findFirst({
        where: {
          OR: [{ email: input.email }],
        },
        select: { id: true },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists",
        });
      }

      const company = await ctx.db.company.upsert({
        where: { code: "OI" },
        update: {},
        create: { name: "Odoo India", code: "OI" },
      });

      const joiningDate = new Date(input.dateOfJoining);
      const joiningYear = joiningDate.getUTCFullYear();
      const serial = await ctx.db.employee.count({
        where: {
          dateOfJoining: {
            gte: new Date(Date.UTC(joiningYear, 0, 1)),
            lt: new Date(Date.UTC(joiningYear + 1, 0, 1)),
          },
        },
      });

      const sequence = String(serial + 1).padStart(4, "0");
      const loginId = `${initials(input.firstName)}${initials(
        input.lastName,
      )}${joiningYear}${sequence}`;
      const employeeCode = `EMP-${joiningYear}-${sequence}`;
      const temporaryPassword = makeTemporaryPassword();
      const passwordHash = await bcrypt.hash(temporaryPassword, 12);

      const employee = await ctx.db.$transaction(async (tx) => {
        const department = await tx.department.upsert({
          where: { name: input.departmentName },
          update: { companyId: company.id },
          create: {
            name: input.departmentName,
            companyId: company.id,
          },
        });

        const designation = await tx.designation.upsert({
          where: {
            name_departmentId: {
              name: input.designationName,
              departmentId: department.id,
            },
          },
          update: {},
          create: {
            name: input.designationName,
            departmentId: department.id,
          },
        });

        return tx.employee.create({
          data: {
            employeeCode,
            company: { connect: { id: company.id } },
            firstName: input.firstName,
            lastName: input.lastName,
            dateOfJoining: joiningDate,
            gender: input.gender,
            phone: input.phone,
            department: { connect: { id: department.id } },
            designation: { connect: { id: designation.id } },
            user: {
              create: {
                email: input.email,
                loginId,
                passwordHash,
                name: `${input.firstName} ${input.lastName}`,
                role: input.role,
                company: { connect: { id: company.id } },
                mustChangePassword: true,
                temporaryPasswordIssuedAt: new Date(),
              },
            },
          },
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            user: {
              select: {
                email: true,
                loginId: true,
                role: true,
              },
            },
          },
        });
      });

      return {
        employee,
        credentials: {
          loginId,
          temporaryPassword,
        },
      };
    }),
});
