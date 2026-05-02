import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";

import { type PrismaClient } from "../../../../generated/prisma";
import { sendOnboardingEmail } from "~/server/email";
import {
  countEmployeesForYear,
  createEmployeeWithUser,
  findDepartmentById,
  findDesignationById,
  findUserByEmail,
  getEmployeeById,
  getUserCompany,
  listEmployeesByCompany,
  updateEmployeeProfile,
} from "~/server/repositories/employee.repo";
import { syncNewEmployee, syncUserRole } from "~/lib/fga-sync";
const salaryViewerRoles: Role[] = ["ADMIN", "PAYROLL_OFFICER"];

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

function emptyToNull(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function dateOrNull(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const date = new Date(`${trimmed}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function listEmployeesForUser(
  db: PrismaClient,
  userId: string,
  filters?: { departmentId?: string; search?: string },
) {
  const creator = await getUserCompany(db, userId);
  const companyId = creator?.companyId;
  if (!companyId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Company setup is required before listing employees",
    });
  }

  return listEmployeesByCompany(db, companyId, filters);
}

export async function createEmployeeForUser(
  db: PrismaClient,
  userId: string,
  input: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    dateOfJoining: string;
    gender: "MALE" | "FEMALE" | "OTHER";
    departmentId: string;
    designationId: string;
    role: "HR_OFFICER" | "PAYROLL_OFFICER" | "EMPLOYEE";
  },
) {
  const creator = await getUserCompany(db, userId);
  const company = creator?.company;
  if (!company) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Company setup is required before creating employees",
    });
  }

  const existing = await findUserByEmail(db, input.email);
  if (existing) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "An account with this email already exists",
    });
  }

  const department = await findDepartmentById(
    db,
    input.departmentId,
    company.id,
  );
  if (!department) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Department not found",
    });
  }

  const designation = await findDesignationById(db, input.designationId);
  if (designation?.departmentId !== department.id) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Designation not found for selected department",
    });
  }

  const joiningDate = new Date(input.dateOfJoining);
  const joiningYear = joiningDate.getUTCFullYear();
  const serial = await countEmployeesForYear(db, company.id, joiningYear);

  const sequence = String(serial + 1).padStart(4, "0");
  const loginId = `${company.code}${initials(
    input.firstName,
  )}${initials(input.lastName)}${joiningYear}${sequence}`;
  const employeeCode = `EMP-${joiningYear}-${sequence}`;
  const temporaryPassword = makeTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  const employee = await db.$transaction(async (tx) => {
    return createEmployeeWithUser(tx, {
      companyId: company.id,
      employeeCode,
      firstName: input.firstName,
      lastName: input.lastName,
      dateOfJoining: joiningDate,
      gender: input.gender,
      phone: input.phone,
      departmentId: department.id,
      designationId: designation.id,
      email: input.email,
      loginId,
      passwordHash,
      role: input.role,
      temporaryPasswordIssuedAt: new Date(),
    });
  });

  // Sync FGA tuples for the new employee
  try {
    // Write the employee's role tuple to OpenFGA
    await syncUserRole(employee.userId, input.role, company.id);
    // Write owner + company tuples for the employee profile
    await syncNewEmployee(employee.userId, employee.id, company.id);
    console.log(`[FGA] Synced tuples for new employee ${employee.id}`);
  } catch (err) {
    console.warn("[FGA] Failed to sync employee tuples (FGA may not be running):", err);
  }

  return {
    employee,
    credentials: {
      loginId,
      temporaryPassword,
    },
    email: await sendOnboardingEmail({
      to: input.email,
      name: `${input.firstName} ${input.lastName}`,
      companyName: company.name,
      loginId,
      temporaryPassword,
      role: input.role,
    }),
  };
}

export async function getEmployeeForUser(
  db: PrismaClient,
  userId: string,
  employeeId: string,
) {
  const creator = await getUserCompany(db, userId);
  const companyId = creator?.companyId;
  if (!companyId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Company setup is required before viewing employees",
    });
  }

  // FGA check was already done at the router level (can_view on employee_profile)
  const employee = await getEmployeeById(db, employeeId);
  if (!employee) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Employee not found",
    });
  }

  if (employee.companyId !== companyId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not allowed to view this profile",
    });
  }

  return employee;
}

export async function getMyProfileForUser(db: PrismaClient, userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      loginId: true,
      name: true,
      role: true,
      company: {
        select: {
          id: true,
          name: true,
          code: true,
          logoUrl: true,
        },
      },
      employee: {
        select: {
          id: true,
          employeeCode: true,
          avatarUrl: true,
          resumeUrl: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          dateOfJoining: true,
          gender: true,
          phone: true,
          address: true,
          personalEmail: true,
          nationality: true,
          maritalStatus: true,
          emergencyContactName: true,
          emergencyContactPhone: true,
          managerName: true,
          workLocation: true,
          about: true,
          jobInterests: true,
          skills: true,
          certifications: true,
          bankName: true,
          bankAccountNumber: true,
          bankIfsc: true,
          panNumber: true,
          uanNumber: true,
          department: { select: { name: true } },
          designation: { select: { name: true } },
          salaryStructure: {
            select: {
              basicSalary: true,
              hra: true,
              effectiveFrom: true,
              isActive: true,
            },
          },
          employeeSalaryComponents: {
            where: { isActive: true },
            select: {
              id: true,
              amount: true,
              salaryComponent: {
                select: {
                  name: true,
                  type: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  if (!user) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  }

  const canViewSalary = salaryViewerRoles.includes(user.role);
  const employee = user.employee;

  return {
    user: {
      id: user.id,
      email: user.email,
      loginId: user.loginId,
      name: user.name,
      role: user.role,
    },
    company: user.company,
    canViewSalary,
    employee: employee
      ? {
          ...employee,
          salaryStructure:
            canViewSalary && employee.salaryStructure
              ? {
                  ...employee.salaryStructure,
                  basicSalary: Number(employee.salaryStructure.basicSalary),
                  hra: Number(employee.salaryStructure.hra),
                }
              : null,
          employeeSalaryComponents: canViewSalary
            ? employee.employeeSalaryComponents.map((component) => ({
                ...component,
                amount: Number(component.amount),
              }))
            : [],
        }
      : null,
  };
}

export async function updateMyProfileForUser(
  db: PrismaClient,
  userId: string,
  input: {
    name?: string;
    phone?: string;
    avatarUrl?: string;
    resumeUrl?: string;
    dateOfBirth?: string;
    address?: string;
    personalEmail?: string;
    nationality?: string;
    maritalStatus?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    managerName?: string;
    workLocation?: string;
    about?: string;
    jobInterests?: string;
    skills?: string;
    certifications?: string;
    bankName?: string;
    bankAccountNumber?: string;
    bankIfsc?: string;
    panNumber?: string;
    uanNumber?: string;
  },
) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, employee: { select: { id: true } } },
  });

  if (!user) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  }

  if (input.name !== undefined) {
    await db.user.update({
      where: { id: user.id },
      data: { name: input.name.trim() },
    });
  }

  if (!user.employee) {
    return getMyProfileForUser(db, userId);
  }

  await db.employee.update({
    where: { id: user.employee.id },
    data: {
      phone: emptyToNull(input.phone),
      avatarUrl: emptyToNull(input.avatarUrl),
      resumeUrl: emptyToNull(input.resumeUrl),
      dateOfBirth: dateOrNull(input.dateOfBirth),
      address: emptyToNull(input.address),
      personalEmail: emptyToNull(input.personalEmail),
      nationality: emptyToNull(input.nationality),
      maritalStatus: emptyToNull(input.maritalStatus),
      emergencyContactName: emptyToNull(input.emergencyContactName),
      emergencyContactPhone: emptyToNull(input.emergencyContactPhone),
      managerName: emptyToNull(input.managerName),
      workLocation: emptyToNull(input.workLocation),
      about: emptyToNull(input.about),
      jobInterests: emptyToNull(input.jobInterests),
      skills: emptyToNull(input.skills),
      certifications: emptyToNull(input.certifications),
      bankName: emptyToNull(input.bankName),
      bankAccountNumber: emptyToNull(input.bankAccountNumber),
      bankIfsc: emptyToNull(input.bankIfsc),
      panNumber: emptyToNull(input.panNumber),
      uanNumber: emptyToNull(input.uanNumber),
    },
  });

  return getMyProfileForUser(db, userId);
}

export async function updateEmployeeForUser(
  db: PrismaClient,
  userId: string,
  input: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    gender: "MALE" | "FEMALE" | "OTHER";
    departmentId: string;
    designationId: string;
  },
) {
  const creator = await getUserCompany(db, userId);
  const companyId = creator?.companyId;
  if (!companyId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Company setup is required before updating employees",
    });
  }

  const department = await findDepartmentById(
    db,
    input.departmentId,
    companyId,
  );
  if (!department) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Department not found",
    });
  }

  const designation = await findDesignationById(db, input.designationId);
  if (designation?.departmentId !== department.id) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Designation not found for selected department",
    });
  }

  const employee = await getEmployeeById(db, input.id);
  if (!employee) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Employee not found",
    });
  }

  if (employee.companyId !== companyId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not allowed to update this profile",
    });
  }

  return updateEmployeeProfile(db, input.id, {
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    gender: input.gender,
    departmentId: department.id,
    designationId: designation.id,
  });
}
