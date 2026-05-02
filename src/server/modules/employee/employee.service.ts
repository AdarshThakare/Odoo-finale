import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";

import { type PrismaClient, type Role } from "../../../../generated/prisma";
import { sendOnboardingEmail } from "~/server/email";
import {
  countEmployeesForYear,
  createEmployeeWithUser,
  findDepartmentById,
  findDesignationById,
  findUserByEmail,
  getEmployeeById,
  getEmployeeByUserId,
  getUserCompany,
  listEmployeesByCompany,
  updateEmployeeProfile,
} from "~/server/repositories/employee.repo";

const creatorRoles: Role[] = ["ADMIN", "HR_OFFICER"];

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

  if (creator.role === "HR_OFFICER" && input.role !== "EMPLOYEE") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "HR officers can only create employee accounts",
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

  if (!creatorRoles.includes(creator.role)) {
    const selfEmployee = await getEmployeeByUserId(db, userId);
    if (selfEmployee?.id !== employeeId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You are not allowed to view this profile",
      });
    }
  }

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
