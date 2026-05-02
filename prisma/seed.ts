import bcrypt from "bcryptjs";
import { config } from "dotenv";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma";

config({ path: ".env.local", override: true });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const company = await prisma.company.upsert({
    where: { code: "OI" },
    update: { name: "Odoo India" },
    create: { name: "Odoo India", code: "OI" },
  });

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

  const passwordHash = await bcrypt.hash("admin@123", 12);
  await prisma.user.upsert({
    where: { email: "admin@empay.com" },
    update: {
      loginId: "ADMIN20260001",
      companyId: company.id,
      mustChangePassword: false,
      lastPasswordChangedAt: new Date(),
    },
    create: {
      email: "admin@empay.com",
      loginId: "ADMIN20260001",
      passwordHash,
      name: "System Admin",
      role: "ADMIN",
      isActive: true,
      companyId: company.id,
      mustChangePassword: false,
      lastPasswordChangedAt: new Date(),
    },
  });

  console.log("Seed complete");
  console.log(
    "Admin credentials: admin@empay.com or ADMIN20260001 / admin@123",
  );
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
