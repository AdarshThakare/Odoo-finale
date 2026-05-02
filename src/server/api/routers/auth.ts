import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

const bootstrapSchema = z
  .object({
    companyName: z.string().min(2, "Company name is required"),
    companyLogoUrl: z.string().url("Invalid logo URL").optional(),
    adminName: z.string().min(2, "Admin name is required"),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

function initials(value: string) {
  return value
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 2)
    .toUpperCase()
    .padEnd(2, "X");
}

function splitName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? "";
  const lastName = parts.length > 1 ? (parts.at(-1) ?? firstName) : firstName;
  return { firstName, lastName };
}

function baseCompanyCode(value: string) {
  const words = value
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^a-zA-Z]/g, ""))
    .filter(Boolean);

  if (words.length >= 2) {
    const first = words[0]?.[0] ?? "";
    const second = words[1]?.[0] ?? "";
    return `${first}${second}`.toUpperCase().padEnd(2, "X");
  }

  const [word] = words;
  if (word) {
    return word.slice(0, 2).toUpperCase().padEnd(2, "X");
  }

  return "CO";
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const authRouter = createTRPCRouter({
  bootstrapAdmin: publicProcedure
    .input(bootstrapSchema)
    .mutation(async ({ ctx, input }) => {
      const existingUser = await ctx.db.user.findFirst({
        where: {
          OR: [{ email: input.email }],
        },
        select: { id: true },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists",
        });
      }

      const existingCompany = await ctx.db.company.findUnique({
        where: { name: input.companyName },
      });

      if (existingCompany) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A company with this name already exists",
        });
      }

      const companyCodeBase = baseCompanyCode(input.companyName);
      let companyCode = companyCodeBase;
      let suffix = 1;

      while (
        await ctx.db.company.findUnique({ where: { code: companyCode } })
      ) {
        suffix += 1;
        companyCode = `${companyCodeBase}${suffix}`;
      }

      const logoUrl = input.companyLogoUrl?.trim();
      const company = await ctx.db.company.create({
        data: {
          name: input.companyName,
          code: companyCode,
          logoUrl: logoUrl && logoUrl.length > 0 ? logoUrl : undefined,
        },
        select: {
          id: true,
          name: true,
          code: true,
        },
      });

      const { firstName, lastName } = splitName(input.adminName);
      const year = new Date().getUTCFullYear();
      const yearStart = new Date(Date.UTC(year, 0, 1));
      const yearEnd = new Date(Date.UTC(year + 1, 0, 1));
      const serial = await ctx.db.user.count({
        where: {
          companyId: company.id,
          createdAt: {
            gte: yearStart,
            lt: yearEnd,
          },
        },
      });
      const sequence = String(serial + 1).padStart(4, "0");
      const loginId = `${company.code}${initials(firstName)}${initials(
        lastName,
      )}${year}${sequence}`;

      const passwordHash = await bcrypt.hash(input.password, 12);

      await ctx.db.user.create({
        data: {
          email: input.email,
          loginId,
          passwordHash,
          name: input.adminName,
          role: "ADMIN",
          isActive: true,
          company: { connect: { id: company.id } },
          mustChangePassword: false,
          lastPasswordChangedAt: new Date(),
        },
      });

      return {
        loginId,
        company,
      };
    }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        email: true,
        loginId: true,
        name: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            department: { select: { name: true } },
            designation: { select: { name: true } },
          },
        },
      },
    });

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    return user;
  }),

  changePassword: protectedProcedure
    .input(changePasswordSchema)
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: {
          id: true,
          email: true,
          loginId: true,
          passwordHash: true,
        },
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const isValid = await bcrypt.compare(
        input.currentPassword,
        user.passwordHash,
      );

      if (!isValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Current password is incorrect",
        });
      }

      const passwordHash = await bcrypt.hash(input.newPassword, 12);

      await ctx.db.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          mustChangePassword: false,
          lastPasswordChangedAt: new Date(),
        },
      });

      return {
        identifier: user.loginId ?? user.email,
      };
    }),
});
