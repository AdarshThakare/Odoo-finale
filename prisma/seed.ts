import { config } from "dotenv";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

import { Prisma, PrismaClient } from "../generated/prisma";

config({ path: ".env.local", override: true });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const demoPassword = "Employee@123";
const demoPasswordHash = await bcrypt.hash(demoPassword, 12);

function utcDate(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function loginInitials(firstName: string, lastName: string) {
  return `${firstName.slice(0, 2)}${lastName.slice(0, 2)}`.toUpperCase();
}

async function upsertDepartment(companyId: string, name: string) {
  return prisma.department.upsert({
    where: { name_companyId: { name, companyId } },
    update: {},
    create: { name, companyId },
  });
}

async function upsertDesignation(departmentId: string, name: string) {
  return prisma.designation.upsert({
    where: { name_departmentId: { name, departmentId } },
    update: {},
    create: { name, departmentId },
  });
}

async function upsertDemoEmployee(input: {
  companyId: string;
  companyCode: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "HR_OFFICER" | "PAYROLL_OFFICER" | "EMPLOYEE";
  employeeCode: string;
  serial: string;
  phone: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  departmentId: string;
  designationId: string;
  basicSalary: number;
  hra: number;
}) {
  const joiningDate = utcDate("2026-01-05");
  const loginId = `${input.companyCode}${loginInitials(
    input.firstName,
    input.lastName,
  )}2026${input.serial}`;

  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: {
      companyId: input.companyId,
      loginId,
      name: `${input.firstName} ${input.lastName}`,
      role: input.role,
      isActive: true,
      mustChangePassword: false,
    },
    create: {
      email: input.email,
      loginId,
      name: `${input.firstName} ${input.lastName}`,
      passwordHash: demoPasswordHash,
      role: input.role,
      companyId: input.companyId,
      isActive: true,
      mustChangePassword: false,
      lastPasswordChangedAt: new Date(),
    },
  });

  const employee = await prisma.employee.upsert({
    where: { userId: user.id },
    update: {
      companyId: input.companyId,
      employeeCode: input.employeeCode,
      firstName: input.firstName,
      lastName: input.lastName,
      dateOfJoining: joiningDate,
      gender: input.gender,
      phone: input.phone,
      departmentId: input.departmentId,
      designationId: input.designationId,
    },
    create: {
      companyId: input.companyId,
      employeeCode: input.employeeCode,
      userId: user.id,
      firstName: input.firstName,
      lastName: input.lastName,
      dateOfJoining: joiningDate,
      gender: input.gender,
      phone: input.phone,
      departmentId: input.departmentId,
      designationId: input.designationId,
    },
  });

  await prisma.salaryStructure.upsert({
    where: { employeeId: employee.id },
    update: {
      basicSalary: input.basicSalary,
      hra: input.hra,
      effectiveFrom: utcDate("2026-01-01"),
      isActive: true,
    },
    create: {
      employeeId: employee.id,
      basicSalary: input.basicSalary,
      hra: input.hra,
      effectiveFrom: utcDate("2026-01-01"),
      isActive: true,
    },
  });

  return employee;
}

async function seedAttendance(employeeId: string) {
  const start = utcDate("2026-05-01");
  const end = utcDate("2026-05-31");
  const cursor = new Date(start);

  while (cursor <= end) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) {
      await prisma.attendanceRecord.upsert({
        where: { employeeId_date: { employeeId, date: new Date(cursor) } },
        update: {
          checkIn: new Date(
            Date.UTC(
              cursor.getUTCFullYear(),
              cursor.getUTCMonth(),
              cursor.getUTCDate(),
              9,
              30,
            ),
          ),
          checkOut: new Date(
            Date.UTC(
              cursor.getUTCFullYear(),
              cursor.getUTCMonth(),
              cursor.getUTCDate(),
              18,
              0,
            ),
          ),
          workingHours: new Prisma.Decimal(8),
          status: "PRESENT",
        },
        create: {
          employeeId,
          date: new Date(cursor),
          checkIn: new Date(
            Date.UTC(
              cursor.getUTCFullYear(),
              cursor.getUTCMonth(),
              cursor.getUTCDate(),
              9,
              30,
            ),
          ),
          checkOut: new Date(
            Date.UTC(
              cursor.getUTCFullYear(),
              cursor.getUTCMonth(),
              cursor.getUTCDate(),
              18,
              0,
            ),
          ),
          workingHours: new Prisma.Decimal(8),
          status: "PRESENT",
        },
      });
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
}

async function seedLeaveAllocation(employeeId: string, leaveTypeId: string) {
  await prisma.leaveAllocation.upsert({
    where: {
      employeeId_leaveTypeId_year: {
        employeeId,
        leaveTypeId,
        year: 2026,
      },
    },
    update: { totalDays: 12 },
    create: {
      employeeId,
      leaveTypeId,
      year: 2026,
      totalDays: 12,
    },
  });

  const existingLedger = await prisma.leaveLedgerEntry.findFirst({
    where: {
      employeeId,
      leaveTypeId,
      transactionType: "ALLOCATION",
      fromDate: utcDate("2026-01-01"),
      toDate: utcDate("2027-01-01"),
    },
    select: { id: true },
  });

  if (!existingLedger) {
    await prisma.leaveLedgerEntry.create({
      data: {
        employeeId,
        leaveTypeId,
        transactionType: "ALLOCATION",
        leaves: new Prisma.Decimal(12),
        fromDate: utcDate("2026-01-01"),
        toDate: utcDate("2027-01-01"),
      },
    });
  }
}

async function main() {
  await prisma.professionalTaxSlab.deleteMany();
  await prisma.professionalTaxSlab.createMany({
    data: [
      { minSalary: 0, maxSalary: 10000, monthlyTax: 0 },
      { minSalary: 10001, maxSalary: 15000, monthlyTax: 150 },
      { minSalary: 15001, maxSalary: null, monthlyTax: 200 },
    ],
  });

  await prisma.leaveType.upsert({
    where: { name: "Casual Leave" },
    update: {},
    create: {
      name: "Casual Leave",
      maxDaysPerYear: 12,
      isPaid: true,
      carryForward: false,
    },
  });
  await prisma.leaveType.upsert({
    where: { name: "Sick Leave" },
    update: {},
    create: {
      name: "Sick Leave",
      maxDaysPerYear: 6,
      isPaid: true,
      carryForward: false,
    },
  });
  await prisma.leaveType.upsert({
    where: { name: "Earned Leave" },
    update: {},
    create: {
      name: "Earned Leave",
      maxDaysPerYear: 15,
      isPaid: true,
      carryForward: true,
    },
  });

  const admin = await prisma.user.findUnique({
    where: { email: "admin@empay.com" },
    include: { company: true },
  });

  if (!admin?.company) {
    console.log("Base seed complete. admin@empay.com company not found.");
    return;
  }

  const engineering = await upsertDepartment(admin.company.id, "Engineering");
  const people = await upsertDepartment(admin.company.id, "People Operations");
  const finance = await upsertDepartment(admin.company.id, "Finance");

  const softwareEngineer = await upsertDesignation(
    engineering.id,
    "Software Engineer",
  );
  const productDesigner = await upsertDesignation(
    engineering.id,
    "Product Designer",
  );
  const hrManager = await upsertDesignation(people.id, "HR Manager");
  const payrollOfficer = await upsertDesignation(finance.id, "Payroll Officer");

  const casualLeave = await prisma.leaveType.findUniqueOrThrow({
    where: { name: "Casual Leave" },
  });

  const demoEmployees = await Promise.all([
    upsertDemoEmployee({
      companyId: admin.company.id,
      companyCode: admin.company.code,
      email: "hr.demo@empay.com",
      firstName: "Aarav",
      lastName: "Mehta",
      role: "HR_OFFICER",
      employeeCode: "DEMO-HR-001",
      serial: "0101",
      phone: "9876501001",
      gender: "MALE",
      departmentId: people.id,
      designationId: hrManager.id,
      basicSalary: 65000,
      hra: 26000,
    }),
    upsertDemoEmployee({
      companyId: admin.company.id,
      companyCode: admin.company.code,
      email: "payroll.demo@empay.com",
      firstName: "Isha",
      lastName: "Rao",
      role: "PAYROLL_OFFICER",
      employeeCode: "DEMO-PR-001",
      serial: "0102",
      phone: "9876501002",
      gender: "FEMALE",
      departmentId: finance.id,
      designationId: payrollOfficer.id,
      basicSalary: 70000,
      hra: 28000,
    }),
    upsertDemoEmployee({
      companyId: admin.company.id,
      companyCode: admin.company.code,
      email: "employee.demo1@empay.com",
      firstName: "Rohan",
      lastName: "Shah",
      role: "EMPLOYEE",
      employeeCode: "DEMO-ENG-001",
      serial: "0103",
      phone: "9876501003",
      gender: "MALE",
      departmentId: engineering.id,
      designationId: softwareEngineer.id,
      basicSalary: 55000,
      hra: 22000,
    }),
    upsertDemoEmployee({
      companyId: admin.company.id,
      companyCode: admin.company.code,
      email: "employee.demo2@empay.com",
      firstName: "Neha",
      lastName: "Patel",
      role: "EMPLOYEE",
      employeeCode: "DEMO-ENG-002",
      serial: "0104",
      phone: "9876501004",
      gender: "FEMALE",
      departmentId: engineering.id,
      designationId: productDesigner.id,
      basicSalary: 52000,
      hra: 20800,
    }),
  ]);

  const internetAllowance = await prisma.salaryComponent.upsert({
    where: { name: "Internet Allowance" },
    update: { type: "EARNING", isActive: true },
    create: { name: "Internet Allowance", type: "EARNING" },
  });
  const mealDeduction = await prisma.salaryComponent.upsert({
    where: { name: "Meal Deduction" },
    update: { type: "DEDUCTION", isActive: true },
    create: { name: "Meal Deduction", type: "DEDUCTION" },
  });

  for (const employee of demoEmployees) {
    await seedAttendance(employee.id);
    await seedLeaveAllocation(employee.id, casualLeave.id);

    await prisma.employeeSalaryComponent.upsert({
      where: {
        employeeId_salaryComponentId: {
          employeeId: employee.id,
          salaryComponentId: internetAllowance.id,
        },
      },
      update: {
        amount: 2000,
        effectiveFrom: utcDate("2026-01-01"),
        isActive: true,
      },
      create: {
        employeeId: employee.id,
        salaryComponentId: internetAllowance.id,
        amount: 2000,
        effectiveFrom: utcDate("2026-01-01"),
        isActive: true,
      },
    });

    await prisma.employeeSalaryComponent.upsert({
      where: {
        employeeId_salaryComponentId: {
          employeeId: employee.id,
          salaryComponentId: mealDeduction.id,
        },
      },
      update: {
        amount: 500,
        effectiveFrom: utcDate("2026-01-01"),
        isActive: true,
      },
      create: {
        employeeId: employee.id,
        salaryComponentId: mealDeduction.id,
        amount: 500,
        effectiveFrom: utcDate("2026-01-01"),
        isActive: true,
      },
    });
  }

  await prisma.payrollPeriod.upsert({
    where: { name: "May 2026 Demo" },
    update: {},
    create: {
      name: "May 2026 Demo",
      startDate: utcDate("2026-05-01"),
      endDate: utcDate("2026-05-31"),
      createdById: admin.id,
    },
  });

  console.log("Seed complete");
  console.log("Demo company:", admin.company.name);
  console.log("Admin login: admin@empay.com / Admin@123");
  console.log("Demo user password:", demoPassword);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
