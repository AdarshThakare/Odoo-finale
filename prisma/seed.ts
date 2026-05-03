import { config } from "dotenv";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

import { Prisma, PrismaClient } from "../generated/prisma";
import { runPayroll } from "../src/server/modules/payroll/payroll.service";

config({ path: ".env.local", override: true });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const demoPassword = "Employee@123";
const adminPassword = "Admin@123";
const demoPasswordHash = await bcrypt.hash(demoPassword, 12);
const adminPasswordHash = await bcrypt.hash(adminPassword, 12);

function utcDate(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function utcDay(year: number, monthIndex: number, day: number) {
  return new Date(Date.UTC(year, monthIndex, day));
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addMonths(date: Date, months: number) {
  return utcDay(date.getUTCFullYear(), date.getUTCMonth() + months, 1);
}

function startOfMonth(date: Date) {
  return utcDay(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

function endOfMonth(date: Date) {
  return utcDay(date.getUTCFullYear(), date.getUTCMonth() + 1, 0);
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

async function upsertDemoCompanyAdmin() {
  const company = await prisma.company.upsert({
    where: { code: "ODOO" },
    update: {
      name: "Odoo Demo",
      logoUrl: "/empay.png",
    },
    create: {
      name: "Odoo Demo",
      code: "ODOO",
      logoUrl: "/empay.png",
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@odoo.com" },
    update: {
      loginId: "ODOOADMIN20260001",
      name: "Odoo Admin",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      companyId: company.id,
      isActive: true,
      mustChangePassword: false,
      lastPasswordChangedAt: new Date(),
    },
    create: {
      email: "admin@odoo.com",
      loginId: "ODOOADMIN20260001",
      name: "Odoo Admin",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      companyId: company.id,
      isActive: true,
      mustChangePassword: false,
      lastPasswordChangedAt: new Date(),
    },
    include: { company: true },
  });

  return { admin, company };
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
  about: string;
  skills: string;
  certifications: string;
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
      avatarUrl: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(`${input.firstName} ${input.lastName}`)}`,
      resumeUrl: "https://example.com/resume.pdf",
      dateOfBirth: utcDate("1996-06-15"),
      dateOfJoining: joiningDate,
      gender: input.gender,
      phone: input.phone,
      address: "Mumbai, Maharashtra",
      personalEmail: input.email.replace(/@[^@]+$/, "@gmail.com"),
      nationality: "Indian",
      maritalStatus: "Single",
      emergencyContactName: "Demo Contact",
      emergencyContactPhone: "9876501999",
      managerName: input.role === "HR_OFFICER" ? "Admin User" : "Aarav Mehta",
      workLocation: "Mumbai HQ",
      about: input.about,
      jobInterests:
        "I enjoy building reliable workplace systems and improving employee experience.",
      skills: input.skills,
      certifications: input.certifications,
      bankName: "HDFC Bank",
      bankAccountNumber: `50100${input.serial}`,
      bankIfsc: "HDFC0001234",
      panNumber: `DEMO${input.serial}P`,
      uanNumber: `100200${input.serial}`,
      departmentId: input.departmentId,
      designationId: input.designationId,
    },
    create: {
      companyId: input.companyId,
      employeeCode: input.employeeCode,
      userId: user.id,
      firstName: input.firstName,
      lastName: input.lastName,
      avatarUrl: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(`${input.firstName} ${input.lastName}`)}`,
      resumeUrl: "https://example.com/resume.pdf",
      dateOfBirth: utcDate("1996-06-15"),
      dateOfJoining: joiningDate,
      gender: input.gender,
      phone: input.phone,
      address: "Mumbai, Maharashtra",
      personalEmail: input.email.replace(/@[^@]+$/, "@gmail.com"),
      nationality: "Indian",
      maritalStatus: "Single",
      emergencyContactName: "Demo Contact",
      emergencyContactPhone: "9876501999",
      managerName: input.role === "HR_OFFICER" ? "Admin User" : "Aarav Mehta",
      workLocation: "Mumbai HQ",
      about: input.about,
      jobInterests:
        "I enjoy building reliable workplace systems and improving employee experience.",
      skills: input.skills,
      certifications: input.certifications,
      bankName: "HDFC Bank",
      bankAccountNumber: `50100${input.serial}`,
      bankIfsc: "HDFC0001234",
      panNumber: `DEMO${input.serial}P`,
      uanNumber: `100200${input.serial}`,
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

async function seedAttendance(
  employeeId: string,
  start: Date,
  end: Date,
  patternOffset: number,
) {
  const cursor = new Date(start);

  while (cursor <= end) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) {
      const patternSeed =
        Math.floor(cursor.getTime() / 86_400_000) + patternOffset;
      const status =
        patternSeed % 23 === 0
          ? "ABSENT"
          : patternSeed % 17 === 0
            ? "ON_LEAVE"
            : patternSeed % 11 === 0
              ? "HALF_DAY"
              : "PRESENT";
      const checkIn =
        status === "ABSENT" || status === "ON_LEAVE"
          ? null
          : new Date(
              Date.UTC(
                cursor.getUTCFullYear(),
                cursor.getUTCMonth(),
                cursor.getUTCDate(),
                9,
                15 + (patternSeed % 5) * 5,
              ),
            );
      const checkOut =
        status === "ABSENT" || status === "ON_LEAVE"
          ? null
          : new Date(
              Date.UTC(
                cursor.getUTCFullYear(),
                cursor.getUTCMonth(),
                cursor.getUTCDate(),
                status === "HALF_DAY" ? 13 : 18,
                status === "HALF_DAY" ? 15 : (patternSeed % 4) * 10,
              ),
            );
      const workingHours =
        status === "PRESENT"
          ? new Prisma.Decimal(8 + (patternSeed % 3) * 0.25)
          : status === "HALF_DAY"
            ? new Prisma.Decimal(4)
            : null;

      await prisma.attendanceRecord.upsert({
        where: { employeeId_date: { employeeId, date: new Date(cursor) } },
        update: {
          checkIn,
          checkOut,
          workingHours,
          status,
          notes:
            status === "ON_LEAVE"
              ? "Seeded approved leave day"
              : status === "ABSENT"
                ? "Seeded absence"
                : null,
        },
        create: {
          employeeId,
          date: new Date(cursor),
          checkIn,
          checkOut,
          workingHours,
          status,
          notes:
            status === "ON_LEAVE"
              ? "Seeded approved leave day"
              : status === "ABSENT"
                ? "Seeded absence"
                : null,
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

  const { admin, company } = await upsertDemoCompanyAdmin();

  const engineering = await upsertDepartment(company.id, "Engineering");
  const people = await upsertDepartment(company.id, "People Operations");
  const finance = await upsertDepartment(company.id, "Finance");
  const sales = await upsertDepartment(company.id, "Sales");

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
  const accountant = await upsertDesignation(finance.id, "Accountant");
  const salesExecutive = await upsertDesignation(sales.id, "Sales Executive");
  const supportLead = await upsertDesignation(
    sales.id,
    "Customer Success Lead",
  );

  const casualLeave = await prisma.leaveType.findUniqueOrThrow({
    where: { name: "Casual Leave" },
  });

  const demoEmployees = await Promise.all([
    upsertDemoEmployee({
      companyId: company.id,
      companyCode: company.code,
      email: "hr.demo@odoo.com",
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
      about:
        "HR officer focused on onboarding, policy hygiene, and employee support.",
      skills: "Employee Relations, Onboarding, Payroll Coordination",
      certifications: "SHRM-CP",
    }),
    upsertDemoEmployee({
      companyId: company.id,
      companyCode: company.code,
      email: "payroll.demo@odoo.com",
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
      about:
        "Payroll officer who keeps pay runs accurate, compliant, and on time.",
      skills: "Payroll, Compliance, Statutory Deductions",
      certifications: "Payroll Compliance Certificate",
    }),
    upsertDemoEmployee({
      companyId: company.id,
      companyCode: company.code,
      email: "employee.demo1@odoo.com",
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
      about:
        "Software engineer working across HR workflows and internal tooling.",
      skills: "React, TypeScript, Prisma, PostgreSQL",
      certifications: "AWS Cloud Practitioner",
    }),
    upsertDemoEmployee({
      companyId: company.id,
      companyCode: company.code,
      email: "employee.demo2@odoo.com",
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
      about: "Product designer focused on clean operational workflows.",
      skills: "Product Design, Figma, User Research",
      certifications: "Google UX Design",
    }),
    upsertDemoEmployee({
      companyId: company.id,
      companyCode: company.code,
      email: "employee.demo3@odoo.com",
      firstName: "Kabir",
      lastName: "Singh",
      role: "EMPLOYEE",
      employeeCode: "DEMO-ENG-003",
      serial: "0105",
      phone: "9876501005",
      gender: "MALE",
      departmentId: engineering.id,
      designationId: softwareEngineer.id,
      basicSalary: 58000,
      hra: 23200,
      about:
        "Backend engineer building reliable payroll and attendance services.",
      skills: "Node.js, PostgreSQL, API Design",
      certifications: "PostgreSQL Associate",
    }),
    upsertDemoEmployee({
      companyId: company.id,
      companyCode: company.code,
      email: "hr.ops@odoo.com",
      firstName: "Maya",
      lastName: "Nair",
      role: "HR_OFFICER",
      employeeCode: "DEMO-HR-002",
      serial: "0106",
      phone: "9876501006",
      gender: "FEMALE",
      departmentId: people.id,
      designationId: hrManager.id,
      basicSalary: 62000,
      hra: 24800,
      about:
        "People operations partner coordinating reviews, leaves, and policy updates.",
      skills: "HR Operations, Leave Management, Employee Engagement",
      certifications: "People Analytics Foundations",
    }),
    upsertDemoEmployee({
      companyId: company.id,
      companyCode: company.code,
      email: "payroll.ops@odoo.com",
      firstName: "Dev",
      lastName: "Kapoor",
      role: "PAYROLL_OFFICER",
      employeeCode: "DEMO-PR-002",
      serial: "0107",
      phone: "9876501007",
      gender: "MALE",
      departmentId: finance.id,
      designationId: accountant.id,
      basicSalary: 66000,
      hra: 26400,
      about:
        "Finance specialist supporting salary components, taxes, and payroll audits.",
      skills: "Accounting, Payroll Audit, Reconciliation",
      certifications: "Tally Payroll Specialist",
    }),
    upsertDemoEmployee({
      companyId: company.id,
      companyCode: company.code,
      email: "employee.demo4@odoo.com",
      firstName: "Ananya",
      lastName: "Iyer",
      role: "EMPLOYEE",
      employeeCode: "DEMO-SALES-001",
      serial: "0108",
      phone: "9876501008",
      gender: "FEMALE",
      departmentId: sales.id,
      designationId: salesExecutive.id,
      basicSalary: 50000,
      hra: 20000,
      about:
        "Sales executive managing demos, renewals, and customer follow-ups.",
      skills: "CRM, Sales Operations, Account Management",
      certifications: "HubSpot Sales Software",
    }),
    upsertDemoEmployee({
      companyId: company.id,
      companyCode: company.code,
      email: "employee.demo5@odoo.com",
      firstName: "Vikram",
      lastName: "Menon",
      role: "EMPLOYEE",
      employeeCode: "DEMO-SALES-002",
      serial: "0109",
      phone: "9876501009",
      gender: "MALE",
      departmentId: sales.id,
      designationId: supportLead.id,
      basicSalary: 54000,
      hra: 21600,
      about:
        "Customer success lead keeping client onboarding smooth and measurable.",
      skills: "Customer Success, Training, Reporting",
      certifications: "Customer Success Manager Level 1",
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

  const today = new Date();
  const attendanceEnd = utcDay(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  const attendanceStart = addMonths(startOfMonth(attendanceEnd), -2);

  for (const [index, employee] of demoEmployees.entries()) {
    await seedAttendance(
      employee.id,
      attendanceStart,
      attendanceEnd,
      index * 7,
    );
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

  const previousMonth = addMonths(startOfMonth(attendanceEnd), -1);
  const twoMonthsAgo = addMonths(startOfMonth(attendanceEnd), -2);
  const previousMonthName = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(previousMonth);
  const twoMonthsAgoName = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(twoMonthsAgo);

  const previousPeriod = await prisma.payrollPeriod.upsert({
    where: { name: `${previousMonthName} Demo` },
    update: {},
    create: {
      name: `${previousMonthName} Demo`,
      startDate: previousMonth,
      endDate: endOfMonth(previousMonth),
      createdById: admin.id,
    },
  });

  await prisma.payrollPeriod.upsert({
    where: { name: `${twoMonthsAgoName} Demo` },
    update: {},
    create: {
      name: `${twoMonthsAgoName} Demo`,
      startDate: twoMonthsAgo,
      endDate: endOfMonth(twoMonthsAgo),
      createdById: admin.id,
    },
  });

  if (
    !(await prisma.payrollEntry.findFirst({
      where: { payrollPeriodId: previousPeriod.id },
      select: { id: true },
    }))
  ) {
    await runPayroll(prisma, admin.id, previousPeriod.id);
  }

  console.log("Seed complete");
  console.log("Demo company:", company.name);
  console.log("Seeded users:", demoEmployees.length + 1);
  console.log(
    "Attendance range:",
    `${dateKey(attendanceStart)} to ${dateKey(attendanceEnd)}`,
  );
  console.log("Admin login: admin@odoo.com / Admin@123");
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
