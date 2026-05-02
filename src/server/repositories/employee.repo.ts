import { type Prisma, type PrismaClient } from "../../../generated/prisma";

type PrismaTransaction = Parameters<PrismaClient["$transaction"]>[0] extends (
  tx: infer T,
) => Promise<unknown>
  ? T
  : never;

export async function getUserCompany(
  db: PrismaClient,
  userId: string,
) {
  return db.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      companyId: true,
      company: {
        select: {
          id: true,
          name: true,
          code: true,
          logoUrl: true,
        },
      },
    },
  });
}

export async function findUserByEmail(db: PrismaClient, email: string) {
  return db.user.findFirst({
    where: { email },
    select: { id: true },
  });
}

export async function countEmployeesForYear(
  db: PrismaClient,
  companyId: string,
  year: number,
) {
  return db.employee.count({
    where: {
      companyId,
      dateOfJoining: {
        gte: new Date(Date.UTC(year, 0, 1)),
        lt: new Date(Date.UTC(year + 1, 0, 1)),
      },
    },
  });
}

export async function findDepartmentById(
  db: PrismaClient,
  departmentId: string,
  companyId: string,
) {
  return db.department.findFirst({
    where: { id: departmentId, companyId },
    select: { id: true },
  });
}

export async function findDesignationById(
  db: PrismaClient,
  designationId: string,
) {
  return db.designation.findUnique({
    where: { id: designationId },
    select: { id: true, departmentId: true },
  });
}

export async function listEmployeesByCompany(
  db: PrismaClient,
  companyId: string,
  filters?: {
    departmentId?: string;
    search?: string;
  },
) {
  const where: Prisma.EmployeeWhereInput = {
    companyId,
  };

  if (filters?.departmentId) {
    where.departmentId = filters.departmentId;
  }

  if (filters?.search) {
    const query = filters.search.trim();
    if (query.length > 0) {
      where.OR = [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        {
          user: {
            is: { email: { contains: query, mode: "insensitive" } },
          },
        },
        {
          user: {
            is: { loginId: { contains: query, mode: "insensitive" } },
          },
        },
      ];
    }
  }

  return db.employee.findMany({
    where,
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
}

export async function getEmployeeById(
  db: PrismaClient,
  employeeId: string,
) {
  return db.employee.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      companyId: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      phone: true,
      gender: true,
      dateOfJoining: true,
      departmentId: true,
      designationId: true,
      user: {
        select: {
          id: true,
          email: true,
          loginId: true,
          role: true,
          isActive: true,
          mustChangePassword: true,
        },
      },
      department: { select: { name: true } },
      designation: { select: { name: true } },
      salaryStructure: {
        select: {
          id: true,
          basicSalary: true,
          hra: true,
          effectiveFrom: true,
          isActive: true,
        },
      },
      employeeSalaryComponents: {
        select: {
          id: true,
          amount: true,
          effectiveFrom: true,
          isActive: true,
          salaryComponent: {
            select: { id: true, name: true, type: true, isActive: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function getEmployeeByUserId(
  db: PrismaClient,
  userId: string,
) {
  return db.employee.findUnique({
    where: { userId },
    select: { id: true, companyId: true },
  });
}

export async function createEmployeeWithUser(
  tx: PrismaTransaction,
  data: {
    companyId: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    dateOfJoining: Date;
    gender: "MALE" | "FEMALE" | "OTHER";
    phone?: string;
    departmentId: string;
    designationId: string;
    email: string;
    loginId: string;
    passwordHash: string;
    role: "HR_OFFICER" | "PAYROLL_OFFICER" | "EMPLOYEE";
    temporaryPasswordIssuedAt: Date;
  },
) {
  return tx.employee.create({
    data: {
      employeeCode: data.employeeCode,
      company: { connect: { id: data.companyId } },
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfJoining: data.dateOfJoining,
      gender: data.gender,
      phone: data.phone,
      department: { connect: { id: data.departmentId } },
      designation: { connect: { id: data.designationId } },
      user: {
        create: {
          email: data.email,
          loginId: data.loginId,
          passwordHash: data.passwordHash,
          name: `${data.firstName} ${data.lastName}`,
          role: data.role,
          company: { connect: { id: data.companyId } },
          mustChangePassword: true,
          temporaryPasswordIssuedAt: data.temporaryPasswordIssuedAt,
        },
      },
    },
    select: {
      id: true,
      userId: true,
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
}

export async function updateEmployeeProfile(
  db: PrismaClient,
  employeeId: string,
  data: {
    firstName: string;
    lastName: string;
    phone?: string;
    gender: "MALE" | "FEMALE" | "OTHER";
    departmentId: string;
    designationId: string;
  },
) {
  return db.employee.update({
    where: { id: employeeId },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      gender: data.gender,
      department: { connect: { id: data.departmentId } },
      designation: { connect: { id: data.designationId } },
      user: {
        update: {
          name: `${data.firstName} ${data.lastName}`,
        },
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      gender: true,
      departmentId: true,
      designationId: true,
    },
  });
}
