# Stage 0 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Runnable EmPay app with credentials-based auth, full PostgreSQL schema, role-based tRPC guards, login/register pages, and a role-gated dashboard shell.

**Architecture:** Next.js 15 App Router with NextAuth v5 (JWT strategy, credentials-only), tRPC v11 for type-safe API, Prisma 7 + PostgreSQL for persistence. Auth session carries `id` + `role` in the JWT — no OAuth, no BaaS.

**Tech Stack:** Next.js 15, tRPC v11, Prisma 7, PostgreSQL, NextAuth v5 beta, bcryptjs, Tailwind CSS v4, Zod

**Spec:** See `EMPAY.md` at project root for full schema, role matrix, and business rules.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `package.json` | Modify | Add bcryptjs + @types/bcryptjs, prisma seed script |
| `src/env.js` | Rewrite | Remove all OAuth vars, keep only AUTH_SECRET + DATABASE_URL |
| `.env.local` | Modify | Add AUTH_SECRET, set DATABASE_URL |
| `prisma/schema.prisma` | Rewrite | Full EmPay schema (User, Employee, Dept, Attendance, Leave, Payroll) |
| `prisma/seed.ts` | Create | Seed PT slabs, 3 default leave types, 1 admin user |
| `src/server/auth/config.ts` | Rewrite | Credentials provider, JWT strategy, session includes role |
| `src/server/api/trpc.ts` | Modify | Add `roleProtectedProcedure(roles[])` factory |
| `src/server/api/routers/auth.ts` | Create | `register`, `me` tRPC procedures |
| `src/server/api/root.ts` | Modify | Wire in authRouter, remove postRouter |
| `src/app/(auth)/login/page.tsx` | Create | Login form with inline Zod validation |
| `src/app/(auth)/register/page.tsx` | Create | Register form (name, email, password) |
| `src/app/(auth)/layout.tsx` | Create | Centered card layout for auth pages |
| `src/app/(dashboard)/layout.tsx` | Create | Sidebar shell + role-conditional nav + session guard |
| `src/app/(dashboard)/page.tsx` | Create | Dashboard home placeholder |
| `src/components/layout/Sidebar.tsx` | Create | Role-gated nav links |
| `src/app/page.tsx` | Rewrite | Redirect: authed→/dashboard, unauthed→/login |
| `src/app/api/auth/[...nextauth]/route.ts` | Keep | No change needed |

---

## Task 1: Install Dependencies & Clean Environment

**Files:**
- Modify: `package.json`
- Modify: `src/env.js`
- Modify: `.env.local`

- [ ] **Step 1: Install bcryptjs**

```bash
npm install bcryptjs
npm install --save-dev @types/bcryptjs
```

Expected output: `added N packages`

- [ ] **Step 2: Rewrite `src/env.js` — strip all OAuth vars**

Replace the entire file with:

```typescript
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },
  client: {},
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
```

- [ ] **Step 3: Populate `.env.local`**

Add these values (generate secret with `npx auth secret`):

```
AUTH_SECRET="<run: npx auth secret and paste output>"
DATABASE_URL="postgresql://postgres:password@localhost:5432/empay"
NODE_ENV="development"
```

- [ ] **Step 4: Add seed script to `package.json`**

In the `"scripts"` block, add:
```json
"db:seed": "tsx prisma/seed.ts"
```

In `"dependencies"`, add:
```json
"tsx": "^4.19.2"
```

Then run:
```bash
npm install tsx
```

---

## Task 2: Rewrite Prisma Schema

**Files:**
- Rewrite: `prisma/schema.prisma`

- [ ] **Step 1: Replace entire `prisma/schema.prisma` with the EmPay schema**

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ────────────────────────────────────────────────────────────────────

enum Role {
  ADMIN
  HR_OFFICER
  PAYROLL_OFFICER
  EMPLOYEE
}

enum Gender {
  MALE
  FEMALE
  OTHER
}

enum AttendanceStatus {
  PRESENT
  HALF_DAY
  ABSENT
  ON_LEAVE
}

enum LeaveStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}

enum LedgerTransaction {
  ALLOCATION
  USAGE
  CANCELLATION
}

enum ComponentType {
  EARNING
  DEDUCTION
}

enum PeriodStatus {
  DRAFT
  PROCESSING
  COMPLETED
}

enum EntryStatus {
  DRAFT
  SUBMITTED
  CANCELLED
}

enum SlipStatus {
  DRAFT
  SUBMITTED
  CANCELLED
}

// ─── Auth & Identity ──────────────────────────────────────────────────────────

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  name          String?
  role          Role      @default(EMPLOYEE)
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  employee      Employee?

  @@index([email])
}

// ─── Org Structure ────────────────────────────────────────────────────────────

model Department {
  id          String        @id @default(cuid())
  name        String        @unique
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  employees    Employee[]
  designations Designation[]
}

model Designation {
  id           String      @id @default(cuid())
  name         String
  departmentId String
  department   Department  @relation(fields: [departmentId], references: [id])
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  employees    Employee[]

  @@unique([name, departmentId])
}

// ─── Employee Profile ─────────────────────────────────────────────────────────

model Employee {
  id                    String      @id @default(cuid())
  employeeCode          String      @unique
  userId                String      @unique
  user                  User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  firstName             String
  lastName              String
  dateOfBirth           DateTime?
  dateOfJoining         DateTime
  gender                Gender
  phone                 String?
  address               String?
  emergencyContactName  String?
  emergencyContactPhone String?
  bankAccountNumber     String?
  bankIfsc              String?
  departmentId          String
  department            Department  @relation(fields: [departmentId], references: [id])
  designationId         String
  designation           Designation @relation(fields: [designationId], references: [id])
  createdAt             DateTime    @default(now())
  updatedAt             DateTime    @updatedAt

  attendanceRecords        AttendanceRecord[]
  leaveApplications        LeaveApplication[]
  leaveAllocations         LeaveAllocation[]
  salaryStructure          SalaryStructure?
  employeeSalaryComponents EmployeeSalaryComponent[]
  salarySlips              SalarySlip[]

  @@index([employeeCode])
  @@index([departmentId])
}

// ─── Attendance ───────────────────────────────────────────────────────────────

model AttendanceRecord {
  id           String           @id @default(cuid())
  employeeId   String
  employee     Employee         @relation(fields: [employeeId], references: [id])
  date         DateTime         @db.Date
  checkIn      DateTime?
  checkOut     DateTime?
  workingHours Decimal?         @db.Decimal(5, 2)
  status       AttendanceStatus @default(ABSENT)
  notes        String?
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  @@unique([employeeId, date])
  @@index([date])
  @@index([employeeId, date])
}

// ─── Leave Management ─────────────────────────────────────────────────────────

model LeaveType {
  id             String    @id @default(cuid())
  name           String    @unique
  maxDaysPerYear Int
  isPaid         Boolean   @default(true)
  carryForward   Boolean   @default(false)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  allocations  LeaveAllocation[]
  applications LeaveApplication[]
  ledgerEntries LeaveLedgerEntry[]
}

model LeaveAllocation {
  id          String    @id @default(cuid())
  employeeId  String
  employee    Employee  @relation(fields: [employeeId], references: [id])
  leaveTypeId String
  leaveType   LeaveType @relation(fields: [leaveTypeId], references: [id])
  year        Int
  totalDays   Int
  usedDays    Decimal   @default(0) @db.Decimal(5, 2)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@unique([employeeId, leaveTypeId, year])
}

model LeaveApplication {
  id              String      @id @default(cuid())
  employeeId      String
  employee        Employee    @relation(fields: [employeeId], references: [id])
  leaveTypeId     String
  leaveType       LeaveType   @relation(fields: [leaveTypeId], references: [id])
  fromDate        DateTime    @db.Date
  toDate          DateTime    @db.Date
  totalDays       Decimal     @db.Decimal(5, 2)
  isHalfDay       Boolean     @default(false)
  halfDayDate     DateTime?   @db.Date
  reason          String
  status          LeaveStatus @default(PENDING)
  approvedById    String?
  approvedAt      DateTime?
  rejectionReason String?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  ledgerEntries LeaveLedgerEntry[]

  @@index([employeeId, status])
}

model LeaveLedgerEntry {
  id                 String            @id @default(cuid())
  employeeId         String
  leaveTypeId        String
  leaveType          LeaveType         @relation(fields: [leaveTypeId], references: [id])
  leaveApplicationId String?
  leaveApplication   LeaveApplication? @relation(fields: [leaveApplicationId], references: [id])
  transactionType    LedgerTransaction
  leaves             Decimal           @db.Decimal(5, 2)
  fromDate           DateTime          @db.Date
  toDate             DateTime          @db.Date
  createdAt          DateTime          @default(now())

  @@index([employeeId, leaveTypeId])
}

// ─── Payroll ──────────────────────────────────────────────────────────────────

model SalaryStructure {
  id            String   @id @default(cuid())
  employeeId    String   @unique
  employee      Employee @relation(fields: [employeeId], references: [id])
  basicSalary   Decimal  @db.Decimal(12, 2)
  hra           Decimal  @db.Decimal(12, 2)
  effectiveFrom DateTime @db.Date
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model SalaryComponent {
  id       String        @id @default(cuid())
  name     String        @unique
  type     ComponentType
  isActive Boolean       @default(true)
  createdAt DateTime     @default(now())

  employeeComponents EmployeeSalaryComponent[]
  slipDetails        SalarySlipDetail[]
}

model EmployeeSalaryComponent {
  id                String          @id @default(cuid())
  employeeId        String
  employee          Employee        @relation(fields: [employeeId], references: [id])
  salaryComponentId String
  salaryComponent   SalaryComponent @relation(fields: [salaryComponentId], references: [id])
  amount            Decimal         @db.Decimal(12, 2)
  effectiveFrom     DateTime        @db.Date
  isActive          Boolean         @default(true)
  createdAt         DateTime        @default(now())

  @@unique([employeeId, salaryComponentId])
}

model ProfessionalTaxSlab {
  id         String   @id @default(cuid())
  minSalary  Decimal  @db.Decimal(12, 2)
  maxSalary  Decimal? @db.Decimal(12, 2)
  monthlyTax Decimal  @db.Decimal(8, 2)
}

model PayrollPeriod {
  id          String       @id @default(cuid())
  name        String       @unique
  startDate   DateTime     @db.Date
  endDate     DateTime     @db.Date
  status      PeriodStatus @default(DRAFT)
  createdById String
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  payrollEntries PayrollEntry[]
}

model PayrollEntry {
  id              String        @id @default(cuid())
  payrollPeriodId String
  payrollPeriod   PayrollPeriod @relation(fields: [payrollPeriodId], references: [id])
  status          EntryStatus   @default(DRAFT)
  totalGross      Decimal       @db.Decimal(14, 2)
  totalDeductions Decimal       @db.Decimal(14, 2)
  totalNet        Decimal       @db.Decimal(14, 2)
  paymentDate     DateTime?     @db.Date
  createdById     String
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  salarySlips SalarySlip[]
}

model SalarySlip {
  id              String       @id @default(cuid())
  payrollEntryId  String
  payrollEntry    PayrollEntry @relation(fields: [payrollEntryId], references: [id])
  employeeId      String
  employee        Employee     @relation(fields: [employeeId], references: [id])
  payrollPeriodId String

  basicSalary      Decimal @db.Decimal(12, 2)
  hra              Decimal @db.Decimal(12, 2)
  totalEarnings    Decimal @db.Decimal(12, 2)
  grossSalary      Decimal @db.Decimal(12, 2)
  pfEmployee       Decimal @db.Decimal(10, 2)
  pfEmployer       Decimal @db.Decimal(10, 2)
  professionalTax  Decimal @db.Decimal(8, 2)
  totalDeductions  Decimal @db.Decimal(12, 2)
  netSalary        Decimal @db.Decimal(12, 2)

  workingDays      Int
  totalWorkingDays Int
  paidLeaveDays    Decimal @db.Decimal(5, 2)

  status    SlipStatus @default(DRAFT)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  slipDetails SalarySlipDetail[]

  @@unique([employeeId, payrollPeriodId])
}

model SalarySlipDetail {
  id                String          @id @default(cuid())
  salarySlipId      String
  salarySlip        SalarySlip      @relation(fields: [salarySlipId], references: [id])
  salaryComponentId String
  salaryComponent   SalaryComponent @relation(fields: [salaryComponentId], references: [id])
  amount            Decimal         @db.Decimal(12, 2)
  type              ComponentType
}
```

- [ ] **Step 2: Verify schema compiles**

```bash
npx prisma validate
```

Expected: `The schema at prisma/schema.prisma is valid`

---

## Task 3: Database Migration & Seed

**Files:**
- Run: `prisma migrate dev`
- Create: `prisma/seed.ts`

- [ ] **Step 1: Ensure PostgreSQL is running, then create the database**

```bash
# Start DB if using Docker (the start-database.sh script)
# bash start-database.sh

# Or ensure your local PostgreSQL has a database named "empay"
psql -U postgres -c "CREATE DATABASE empay;" 2>/dev/null || echo "DB may already exist"
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name init-empay-schema
```

Expected: `✔  Generated Prisma Client` and all tables created.

- [ ] **Step 3: Create `prisma/seed.ts`**

```typescript
import { PrismaClient } from "../generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Professional Tax Slabs (Indian standard)
  await prisma.professionalTaxSlab.deleteMany();
  await prisma.professionalTaxSlab.createMany({
    data: [
      { minSalary: 0,      maxSalary: 10000,  monthlyTax: 0   },
      { minSalary: 10001,  maxSalary: 15000,  monthlyTax: 150 },
      { minSalary: 15001,  maxSalary: null,   monthlyTax: 200 },
    ],
  });

  // Default Leave Types
  await prisma.leaveType.upsert({
    where: { name: "Casual Leave" },
    update: {},
    create: { name: "Casual Leave", maxDaysPerYear: 12, isPaid: true, carryForward: false },
  });
  await prisma.leaveType.upsert({
    where: { name: "Sick Leave" },
    update: {},
    create: { name: "Sick Leave", maxDaysPerYear: 6, isPaid: true, carryForward: false },
  });
  await prisma.leaveType.upsert({
    where: { name: "Earned Leave" },
    update: {},
    create: { name: "Earned Leave", maxDaysPerYear: 15, isPaid: true, carryForward: true },
  });

  // Default Admin User
  const passwordHash = await bcrypt.hash("admin@123", 12);
  await prisma.user.upsert({
    where: { email: "admin@empay.com" },
    update: {},
    create: {
      email: "admin@empay.com",
      passwordHash,
      name: "System Admin",
      role: "ADMIN",
      isActive: true,
    },
  });

  console.log("✅ Seed complete");
  console.log("   Admin credentials → admin@empay.com / admin@123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 4: Run seed**

```bash
npm run db:seed
```

Expected:
```
✅ Seed complete
   Admin credentials → admin@empay.com / admin@123
```

---

## Task 4: NextAuth v5 Credentials Provider

**Files:**
- Rewrite: `src/server/auth/config.ts`

- [ ] **Step 1: Rewrite `src/server/auth/config.ts`**

```typescript
import { type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "~/server/db";
import { type Role } from "../../generated/prisma";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: Role;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}

export const authConfig = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.isActive) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash,
        );
        if (!isValid) return null;

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: Role }).role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
} satisfies NextAuthConfig;
```

- [ ] **Step 2: Verify `src/server/auth/index.ts` exports `auth`, `signIn`, `signOut`**

Read the file — it should already export these from NextAuth. If it shows `export const { auth, signIn, signOut } = NextAuth(authConfig)`, no changes needed. Otherwise replace with:

```typescript
import NextAuth from "next-auth";
import { authConfig } from "./config";

export const { auth, signIn, signOut, handlers } = NextAuth(authConfig);
```

---

## Task 5: tRPC Role Guards

**Files:**
- Modify: `src/server/api/trpc.ts`

- [ ] **Step 1: Add role-based procedure factory to the bottom of `src/server/api/trpc.ts`**

Add these lines after the existing `protectedProcedure` export:

```typescript
import { type Role } from "../../generated/prisma";

/**
 * Role-protected procedure factory.
 * Usage: roleProcedure([Role.ADMIN, Role.HR_OFFICER])
 */
export const roleProcedure = (allowedRoles: Role[]) =>
  protectedProcedure.use(({ ctx, next }) => {
    if (!allowedRoles.includes(ctx.session.user.role as Role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Requires one of: ${allowedRoles.join(", ")}`,
      });
    }
    return next({ ctx });
  });
```

> **Why a factory?** `roleProcedure([Role.ADMIN])` reads like English at the call site and avoids one middleware per role combination.

- [ ] **Step 2: Verify the import for Role is correct**

The `Role` enum is in `generated/prisma`. The import path `../../generated/prisma` from `src/server/api/trpc.ts` is correct.

---

## Task 6: Auth tRPC Router

**Files:**
- Create: `src/server/api/routers/auth.ts`
- Modify: `src/server/api/root.ts`
- Delete: `src/server/api/routers/post.ts` (no longer needed)

- [ ] **Step 1: Create `src/server/api/routers/auth.ts`**

```typescript
import { z } from "zod";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const authRouter = createTRPCRouter({
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.user.findUnique({
        where: { email: input.email },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists",
        });
      }

      const passwordHash = await bcrypt.hash(input.password, 12);
      const user = await ctx.db.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash,
          role: "EMPLOYEE",
        },
        select: { id: true, email: true, name: true, role: true },
      });

      return user;
    }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
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
});
```

- [ ] **Step 2: Rewrite `src/server/api/root.ts`**

```typescript
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { authRouter } from "~/server/api/routers/auth";

export const appRouter = createTRPCRouter({
  auth: authRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
```

- [ ] **Step 3: Delete the unused post router**

```bash
rm src/server/api/routers/post.ts
rm src/app/_components/post.tsx
```

---

## Task 7: Login Page

**Files:**
- Create: `src/app/(auth)/layout.tsx`
- Create: `src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Create `src/app/(auth)/layout.tsx`**

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-purple-700">EmPay</h1>
          <p className="mt-1 text-sm text-gray-500">Smart HR & Payroll Management</p>
        </div>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/app/(auth)/login/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type FieldErrors = Partial<Record<"email" | "password", string>>;

export default function LoginPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError("");
    const formData = new FormData(e.currentTarget);
    const raw = { email: formData.get("email"), password: formData.get("password") };

    const result = loginSchema.safeParse(raw);
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof FieldErrors;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setLoading(true);

    const res = await signIn("credentials", {
      email: result.data.email,
      password: result.data.password,
      redirect: false,
    });

    setLoading(false);
    if (res?.error) {
      setServerError("Invalid email or password");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
      <h2 className="mb-6 text-xl font-semibold text-gray-900">Sign in to your account</h2>

      {serverError && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm outline-none transition focus:ring-2 focus:ring-purple-500 ${
              errors.email ? "border-red-400 bg-red-50" : "border-gray-300"
            }`}
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm outline-none transition focus:ring-2 focus:ring-purple-500 ${
              errors.password ? "border-red-400 bg-red-50" : "border-gray-300"
            }`}
          />
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-800 disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-purple-700 hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
```

---

## Task 8: Register Page

**Files:**
- Create: `src/app/(auth)/register/page.tsx`

- [ ] **Step 1: Create `src/app/(auth)/register/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FieldErrors = Partial<Record<"name" | "email" | "password" | "confirmPassword", string>>;

export default function RegisterPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");

  const register = api.auth.register.useMutation({
    onSuccess: () => router.push("/login?registered=true"),
    onError: (err) => setServerError(err.message),
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError("");
    const formData = new FormData(e.currentTarget);
    const raw = {
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    };

    const result = registerSchema.safeParse(raw);
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof FieldErrors;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    register.mutate({ name: result.data.name, email: result.data.email, password: result.data.password });
  }

  const fields = [
    { id: "name", label: "Full name", type: "text", autocomplete: "name" },
    { id: "email", label: "Email address", type: "email", autocomplete: "email" },
    { id: "password", label: "Password", type: "password", autocomplete: "new-password" },
    { id: "confirmPassword", label: "Confirm password", type: "password", autocomplete: "new-password" },
  ] as const;

  return (
    <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
      <h2 className="mb-6 text-xl font-semibold text-gray-900">Create your account</h2>

      {serverError && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map(({ id, label, type, autocomplete }) => (
          <div key={id}>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700">
              {label}
            </label>
            <input
              id={id}
              name={id}
              type={type}
              autoComplete={autocomplete}
              className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm outline-none transition focus:ring-2 focus:ring-purple-500 ${
                errors[id] ? "border-red-400 bg-red-50" : "border-gray-300"
              }`}
            />
            {errors[id] && <p className="mt-1 text-xs text-red-600">{errors[id]}</p>}
          </div>
        ))}

        <button
          type="submit"
          disabled={register.isPending}
          className="w-full rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-800 disabled:opacity-60"
        >
          {register.isPending ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-purple-700 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
```

---

## Task 9: Dashboard Layout Shell & Sidebar

**Files:**
- Create: `src/components/layout/Sidebar.tsx`
- Create: `src/app/(dashboard)/layout.tsx`
- Create: `src/app/(dashboard)/page.tsx`

- [ ] **Step 1: Create `src/components/layout/Sidebar.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { type Role } from "../../../generated/prisma";

interface NavItem {
  label: string;
  href: string;
  roles: Role[];
  icon: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard",  href: "/dashboard",            roles: ["ADMIN","HR_OFFICER","PAYROLL_OFFICER","EMPLOYEE"], icon: "⊞" },
  { label: "Employees",  href: "/dashboard/employees",  roles: ["ADMIN","HR_OFFICER"],                              icon: "👥" },
  { label: "Attendance", href: "/dashboard/attendance", roles: ["ADMIN","HR_OFFICER","PAYROLL_OFFICER","EMPLOYEE"], icon: "📅" },
  { label: "Leave",      href: "/dashboard/leave",      roles: ["ADMIN","HR_OFFICER","PAYROLL_OFFICER","EMPLOYEE"], icon: "🌴" },
  { label: "Payroll",    href: "/dashboard/payroll",    roles: ["ADMIN","PAYROLL_OFFICER"],                         icon: "💰" },
  { label: "Settings",   href: "/dashboard/settings",   roles: ["ADMIN"],                                           icon: "⚙️" },
];

interface SidebarProps {
  role: Role;
  userName: string;
}

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();
  const visible = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        <span className="text-xl font-bold text-purple-700">EmPay</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {visible.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-purple-50 text-purple-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-gray-200 p-4">
        <div className="mb-3 px-1">
          <p className="truncate text-sm font-medium text-gray-900">{userName}</p>
          <p className="text-xs text-gray-500">{role.replace("_", " ")}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Create `src/app/(dashboard)/layout.tsx`**

```tsx
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { Sidebar } from "~/components/layout/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        role={session.user.role}
        userName={session.user.name ?? session.user.email}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/app/(dashboard)/page.tsx`**

```tsx
import { auth } from "~/server/auth";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">
        Welcome back, {session?.user.name ?? "there"} 👋
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Role: <span className="font-medium text-purple-700">{session?.user.role}</span>
      </p>
      <div className="mt-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <p className="text-gray-500">Dashboard analytics coming in Stage 5.</p>
      </div>
    </div>
  );
}
```

---

## Task 10: Root Page Redirect & Cleanup

**Files:**
- Rewrite: `src/app/page.tsx`

- [ ] **Step 1: Rewrite `src/app/page.tsx` as a redirect**

```tsx
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";

export default async function RootPage() {
  const session = await auth();
  redirect(session?.user ? "/dashboard" : "/login");
}
```

- [ ] **Step 2: Update `src/app/layout.tsx` metadata**

Replace title and description:
```tsx
export const metadata: Metadata = {
  title: "EmPay — Smart HRMS",
  description: "Human Resource & Payroll Management System",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};
```

---

## Task 11: Smoke Test & Checkpoint

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Expected: No TypeScript errors, server starts on `http://localhost:3000`

- [ ] **Step 2: Test register flow**

1. Open `http://localhost:3000` → should redirect to `/login`
2. Click "Create one" → `/register`
3. Submit with invalid email → inline error appears
4. Submit with weak password → inline error appears
5. Submit valid form → redirected to `/login?registered=true`

- [ ] **Step 3: Test login flow**

1. Login with `admin@empay.com` / `admin@123`
2. Should redirect to `/dashboard`
3. Sidebar should show ALL nav items (Admin role)
4. Login with a new EMPLOYEE account — sidebar should NOT show Payroll or Settings

- [ ] **Step 4: Test role guard on tRPC**

In browser console while logged in as Employee, this should work:
- `auth.me` → returns user + role ✅

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Stage 0 — auth foundation, full schema, dashboard shell"
```

---

## Self-Review Notes

- **Spec coverage:** All Stage 0 checklist items from `EMPAY.md` are covered.
- **No placeholders:** All code blocks are complete and copy-pasteable.
- **Type consistency:** `Role` enum imported from `generated/prisma` consistently across `config.ts`, `trpc.ts`, `Sidebar.tsx`.
- **Known gotcha:** NextAuth v5 beta `signIn` from `next-auth/react` requires the `callbackUrl` to be on the same origin. The credentials flow uses `redirect: false` + manual `router.push` to avoid full-page reloads.
- **Known gotcha:** `bcryptjs` must be imported as a CommonJS default — `import bcrypt from "bcryptjs"` (not `import { hash }`).
