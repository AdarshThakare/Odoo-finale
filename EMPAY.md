# EmPay — Smart HRMS: Master Spec & Dev Stages

> Agent-readable project spec. Read this before writing any code.
> Stack: Next.js 15 · tRPC v11 · Prisma 7 · PostgreSQL · NextAuth v5 · Tailwind CSS v4 · Zod · Recharts
> Reference: https://github.com/frappe/hrms (domain logic patterns only)

---

## 1. Roles & Permissions Matrix

| Capability                         | Employee  | HR Officer | Payroll Officer | Admin |
| ---------------------------------- | --------- | ---------- | --------------- | ----- |
| View own profile                   | ✅        | ✅         | ✅              | ✅    |
| Edit own profile                   | ✅        | ✅         | ✅              | ✅    |
| Create/edit employee profiles      | ❌        | ✅         | ❌              | ✅    |
| View employee directory            | ✅ (read) | ✅         | ✅              | ✅    |
| Mark own attendance (check-in/out) | ✅        | ✅         | ✅              | ✅    |
| View own attendance logs           | ✅        | ✅         | ✅              | ✅    |
| View ALL attendance records        | ❌        | ✅         | ✅              | ✅    |
| Apply for leave                    | ✅        | ✅         | ✅              | ✅    |
| Approve/reject leave requests      | ❌        | ❌         | ✅              | ✅    |
| Manage leave types & allocations   | ❌        | ✅         | ❌              | ✅    |
| View own payslip                   | ❌        | ❌         | ❌              | ✅\*  |
| Generate/manage payroll            | ❌        | ❌         | ✅              | ✅    |
| Manage salary components/structure | ❌        | ❌         | ✅              | ✅    |
| View dashboard analytics           | own only  | HR scope   | payroll scope   | full  |
| Manage user roles & settings       | ❌        | ❌         | ❌              | ✅    |

\*Employees can view their own payslip once generated.

---

## 1.1 Authentication & Account Creation Flow

EmPay does **not** allow normal employees to self-register. Public sign-up is disabled for security and data integrity.

**Account creation flow:**

1. The initial admin is created by the seed/onboarding process.
2. Admin or HR Officer creates employee accounts from the protected Employees module.
3. During employee creation, the system auto-generates:
   - `loginId`
   - `employeeCode`
   - temporary password
4. The employee receives the Login ID and temporary password through email or an Admin/HR handoff.
5. The employee signs in using either Login ID or email plus password.
6. Employees with generated passwords are marked `mustChangePassword=true` and should be routed to password management before normal usage once that screen exists.

**Login ID format:**

```txt
[First two letters of first name][First two letters of last name][Joining year][Serial number for that year]
```

Example:

```txt
SAKA20260001
```

Meaning:

```txt
SAKA = first two letters of first name + first two letters of last name
2026 = year of joining
0001 = serial number for that joining year
```

**Role assignment rules:**

- `ADMIN` can create users for all roles.
- `HR_OFFICER` can create employee profiles and employee accounts.
- Public `/register` must not create accounts.
- `PAYROLL_OFFICER` and `EMPLOYEE` cannot create users.

---

## 2. Database Schema (PostgreSQL via Prisma)

### 2.1 Auth & Identity

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  loginId       String?   @unique
  passwordHash  String
  name          String?
  role          Role      @default(EMPLOYEE)
  isActive      Boolean   @default(true)
  mustChangePassword Boolean @default(false)
  temporaryPasswordIssuedAt DateTime?
  lastPasswordChangedAt DateTime?
  companyId     String?
  company       Company?  @relation(fields: [companyId], references: [id])
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  employee      Employee?

  @@index([email])
  @@index([loginId])
}

enum Role {
  ADMIN
  HR_OFFICER
  PAYROLL_OFFICER
  EMPLOYEE
}
```

### 2.2 Employee Profile

```prisma
model Company {
  id        String   @id @default(cuid())
  name      String   @unique
  code      String   @unique
  logoUrl   String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users       User[]
  departments Department[]
  employees   Employee[]
}

model Department {
  id          String        @id @default(cuid())
  name        String        @unique
  companyId   String?
  company     Company?      @relation(fields: [companyId], references: [id])
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  employees   Employee[]
  designations Designation[]
}

model Designation {
  id           String     @id @default(cuid())
  name         String
  departmentId String
  department   Department @relation(fields: [departmentId], references: [id])
  employees    Employee[]
  @@unique([name, departmentId])
}

model Employee {
  id                    String      @id @default(cuid())
  employeeCode          String      @unique  // EMP-001, auto-generated
  userId                String      @unique
  user                  User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  companyId             String?
  company               Company?    @relation(fields: [companyId], references: [id])
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

  attendanceRecords     AttendanceRecord[]
  leaveApplications     LeaveApplication[]
  leaveAllocations      LeaveAllocation[]
  salaryStructure       SalaryStructure?
  employeeSalaryComponents EmployeeSalaryComponent[]
  salarySlips           SalarySliip[]
}

enum Gender {
  MALE
  FEMALE
  OTHER
}
```

### 2.3 Attendance

```prisma
model AttendanceRecord {
  id           String           @id @default(cuid())
  employeeId   String
  employee     Employee         @relation(fields: [employeeId], references: [id])
  date         DateTime         @db.Date
  checkIn      DateTime?
  checkOut     DateTime?
  workingHours Decimal?         @db.Decimal(5, 2)  // computed on checkout
  status       AttendanceStatus @default(ABSENT)
  notes        String?
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  @@unique([employeeId, date])
  @@index([date])
  @@index([employeeId, date])
}

enum AttendanceStatus {
  PRESENT      // workingHours >= 8
  HALF_DAY     // workingHours >= 4 && < 8
  ABSENT       // no check-in or workingHours < 4
  ON_LEAVE     // approved leave exists for this date
}
```

**Status derivation logic (in `attendance.service.ts`):**

- On check-in: create record with status=ABSENT, checkIn=now
- On check-out: compute `workingHours = (checkOut - checkIn) / 3600`
  - `>= 8h` → PRESENT
  - `>= 4h` → HALF_DAY
  - `< 4h` → ABSENT
- If approved leave exists for date → status=ON_LEAVE (set during leave approval)

### 2.4 Leave Management

```prisma
model LeaveType {
  id               String  @id @default(cuid())
  name             String  @unique        // "Casual Leave", "Sick Leave"
  maxDaysPerYear   Int
  isPaid           Boolean @default(true)
  carryForward     Boolean @default(false)
  createdAt        DateTime @default(now())

  allocations      LeaveAllocation[]
  applications     LeaveApplication[]
  ledgerEntries    LeaveLedgerEntry[]
}

model LeaveAllocation {
  id            String    @id @default(cuid())
  employeeId    String
  employee      Employee  @relation(fields: [employeeId], references: [id])
  leaveTypeId   String
  leaveType     LeaveType @relation(fields: [leaveTypeId], references: [id])
  year          Int                        // fiscal year e.g. 2025
  totalDays     Int
  usedDays      Decimal   @default(0) @db.Decimal(5, 2)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@unique([employeeId, leaveTypeId, year])
}

model LeaveApplication {
  id               String          @id @default(cuid())
  employeeId       String
  employee         Employee        @relation(fields: [employeeId], references: [id])
  leaveTypeId      String
  leaveType        LeaveType       @relation(fields: [leaveTypeId], references: [id])
  fromDate         DateTime        @db.Date
  toDate           DateTime        @db.Date
  totalDays        Decimal         @db.Decimal(5, 2)
  isHalfDay        Boolean         @default(false)
  halfDayDate      DateTime?       @db.Date
  reason           String
  status           LeaveStatus     @default(PENDING)
  approvedById     String?
  approvedAt       DateTime?
  rejectionReason  String?
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt

  ledgerEntries    LeaveLedgerEntry[]
}

enum LeaveStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}

model LeaveLedgerEntry {
  id                 String          @id @default(cuid())
  employeeId         String
  leaveTypeId        String
  leaveApplicationId String?
  leaveApplication   LeaveApplication? @relation(fields: [leaveApplicationId], references: [id])
  transactionType    LedgerTransaction
  leaves             Decimal         @db.Decimal(5, 2)  // positive=credit, negative=debit
  fromDate           DateTime        @db.Date
  toDate             DateTime        @db.Date
  createdAt          DateTime        @default(now())
}

enum LedgerTransaction {
  ALLOCATION   // HR allocates leave (+)
  USAGE        // Approved application (-)
  CANCELLATION // Leave cancelled (+)
}
```

**Leave balance = SUM(leaves) from LeaveLedgerEntry WHERE employeeId + leaveTypeId + year**

### 2.5 Payroll

```prisma
// Master salary definition per employee
model SalaryStructure {
  id            String    @id @default(cuid())
  employeeId    String    @unique
  employee      Employee  @relation(fields: [employeeId], references: [id])
  basicSalary   Decimal   @db.Decimal(12, 2)
  hra           Decimal   @db.Decimal(12, 2)   // can be fixed or 40% of basic
  effectiveFrom DateTime  @db.Date
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

// Configurable component catalogue (Admin/Payroll Officer manages)
model SalaryComponent {
  id        String        @id @default(cuid())
  name      String        @unique  // "Travel Allowance", "Performance Bonus"
  type      ComponentType
  isActive  Boolean       @default(true)
  createdAt DateTime      @default(now())

  employeeComponents EmployeeSalaryComponent[]
  slipDetails        SalarySlipDetail[]
}

enum ComponentType {
  EARNING
  DEDUCTION
}

// Per-employee component assignments with amounts
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

// Professional Tax slabs (India-specific, seeded in DB)
model ProfessionalTaxSlab {
  id          String   @id @default(cuid())
  minSalary   Decimal  @db.Decimal(12, 2)
  maxSalary   Decimal? @db.Decimal(12, 2)  // null = no upper bound
  monthlyTax  Decimal  @db.Decimal(8, 2)
}

// Payroll period (e.g. "May 2025")
model PayrollPeriod {
  id          String         @id @default(cuid())
  name        String         @unique  // "May 2025"
  startDate   DateTime       @db.Date
  endDate     DateTime       @db.Date
  status      PeriodStatus   @default(DRAFT)
  createdById String
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  payrollEntries PayrollEntry[]
}

enum PeriodStatus {
  DRAFT
  PROCESSING
  COMPLETED
}

// A payrun — one per period, contains all employee slips
model PayrollEntry {
  id               String       @id @default(cuid())
  payrollPeriodId  String
  payrollPeriod    PayrollPeriod @relation(fields: [payrollPeriodId], references: [id])
  status           EntryStatus  @default(DRAFT)
  totalGross       Decimal      @db.Decimal(14, 2)
  totalDeductions  Decimal      @db.Decimal(14, 2)
  totalNet         Decimal      @db.Decimal(14, 2)
  paymentDate      DateTime?    @db.Date
  createdById      String
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  salarySlips      SalarySlip[]
}

enum EntryStatus {
  DRAFT
  SUBMITTED
  CANCELLED
}

// Individual payslip per employee per payrun
model SalarySlip {
  id               String       @id @default(cuid())
  payrollEntryId   String
  payrollEntry     PayrollEntry @relation(fields: [payrollEntryId], references: [id])
  employeeId       String
  employee         Employee     @relation(fields: [employeeId], references: [id])
  payrollPeriodId  String

  // Earnings
  basicSalary      Decimal      @db.Decimal(12, 2)
  hra              Decimal      @db.Decimal(12, 2)
  totalEarnings    Decimal      @db.Decimal(12, 2)  // sum of EARNING components
  grossSalary      Decimal      @db.Decimal(12, 2)  // basic + hra + totalEarnings (prorated)

  // Statutory deductions
  pfEmployee       Decimal      @db.Decimal(10, 2)  // 12% of basic
  pfEmployer       Decimal      @db.Decimal(10, 2)  // 12% of basic (informational)
  professionalTax  Decimal      @db.Decimal(8, 2)

  // Additional deductions
  totalDeductions  Decimal      @db.Decimal(12, 2)

  // Net
  netSalary        Decimal      @db.Decimal(12, 2)

  // Attendance summary
  workingDays      Int                              // actual days worked
  totalWorkingDays Int                              // working days in period
  paidLeaveDays    Decimal      @db.Decimal(5, 2)

  status           SlipStatus   @default(DRAFT)
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  slipDetails      SalarySlipDetail[]

  @@unique([employeeId, payrollPeriodId])
}

enum SlipStatus {
  DRAFT
  SUBMITTED
  CANCELLED
}

// Line items on the payslip
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

---

## 3. Payroll Calculation Engine

File: `src/server/modules/payroll/payroll.engine.ts`

```
For each employee in the payroll period:

1. totalWorkingDays = count Mon–Fri between startDate and endDate
2. daysWorked      = COUNT(attendance WHERE status=PRESENT AND date IN period)
                   + COUNT(attendance WHERE status=HALF_DAY) * 0.5
3. paidLeaveDays   = SUM(leaveApplications WHERE status=APPROVED AND leaveType.isPaid=true)
4. effectiveDays   = daysWorked + paidLeaveDays
5. salaryFactor    = effectiveDays / totalWorkingDays

6. basicProrated   = basicSalary * salaryFactor
7. hraProrated     = hra * salaryFactor
8. earningComponents = SUM(employeeSalaryComponents WHERE type=EARNING) * salaryFactor
9. grossSalary     = basicProrated + hraProrated + earningComponents

10. pfEmployee     = basicProrated * 0.12
11. pfEmployer     = basicProrated * 0.12
12. professionalTax = lookup ProfessionalTaxSlab WHERE grossSalary in (min, max]
13. deductionComponents = SUM(employeeSalaryComponents WHERE type=DEDUCTION)
14. totalDeductions = pfEmployee + professionalTax + deductionComponents

15. netSalary      = grossSalary - totalDeductions
```

**PT Seed Data (Indian standard):**
| Monthly Gross | Monthly PT |
|-------------------|------------|
| 0 – 10,000 | ₹0 |
| 10,001 – 15,000 | ₹150 |
| 15,001+ | ₹200 |

---

## 4. Directory Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Sidebar shell + role-guard
│   │   ├── page.tsx                # Dashboard home
│   │   ├── employees/
│   │   │   ├── page.tsx            # Employee directory
│   │   │   └── [id]/page.tsx       # Employee profile
│   │   ├── attendance/
│   │   │   ├── page.tsx            # Own attendance (Employee view)
│   │   │   └── all/page.tsx        # All employees (HR/Admin view)
│   │   ├── leave/
│   │   │   ├── page.tsx            # My leave applications
│   │   │   ├── apply/page.tsx
│   │   │   ├── approvals/page.tsx  # Payroll Officer view
│   │   │   └── manage/page.tsx     # HR: allocations + leave types
│   │   ├── payroll/
│   │   │   ├── page.tsx            # Payroll Officer: payrun list
│   │   │   ├── [periodId]/page.tsx # Payrun detail + slips
│   │   │   └── payslip/[id]/page.tsx
│   │   └── settings/
│   │       └── page.tsx            # Admin: users, roles, components
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   └── trpc/[trpc]/route.ts
│   └── layout.tsx
│
├── server/
│   ├── api/
│   │   ├── root.ts                 # Merges all routers
│   │   └── routers/
│   │       ├── auth.ts
│   │       ├── employees.ts
│   │       ├── attendance.ts
│   │       ├── leave.ts
│   │       ├── payroll.ts
│   │       └── dashboard.ts
│   ├── modules/                    # Pure business logic (no HTTP)
│   │   ├── attendance/
│   │   │   └── attendance.service.ts
│   │   ├── leave/
│   │   │   ├── leave.service.ts
│   │   │   └── leave.utils.ts      # day counting, weekend exclusion
│   │   ├── payroll/
│   │   │   ├── payroll.service.ts
│   │   │   ├── payroll.engine.ts   # THE calculation engine (pure functions)
│   │   │   └── payroll.utils.ts    # PT slab lookup, PF rate constants
│   │   └── dashboard/
│   │       └── dashboard.service.ts
│   ├── repositories/               # All Prisma queries (no logic)
│   │   ├── user.repo.ts
│   │   ├── employee.repo.ts
│   │   ├── attendance.repo.ts
│   │   ├── leave.repo.ts
│   │   └── payroll.repo.ts
│   ├── auth/
│   │   ├── config.ts               # NextAuth credentials provider
│   │   └── index.ts
│   └── db.ts                       # Prisma client singleton
│
├── lib/
│   ├── validators/                 # Zod schemas (shared FE + BE)
│   │   ├── auth.schema.ts
│   │   ├── employee.schema.ts
│   │   ├── attendance.schema.ts
│   │   ├── leave.schema.ts
│   │   └── payroll.schema.ts
│   ├── permissions.ts              # Role-based guard helpers
│   └── utils.ts
│
├── components/
│   ├── ui/                         # Button, Input, Modal, Badge, Table
│   ├── layout/                     # Sidebar, Topbar, PageHeader
│   └── charts/                     # Recharts wrappers (AttendanceChart, etc.)
│
├── hooks/
│   └── useCurrentEmployee.ts
│
└── trpc/
    ├── react.tsx
    ├── server.ts
    └── query-client.ts
```

---

## 5. tRPC API Surface

### auth router

| Procedure     | Type     | Who    | Description                  |
| ------------- | -------- | ------ | ---------------------------- |
| register      | mutation | public | Create user + employee shell |
| login         | mutation | public | Credentials sign-in          |
| me            | query    | authed | Current user + role          |
| updateProfile | mutation | authed | Edit own profile             |

### employees router

| Procedure  | Type     | Who              | Description               |
| ---------- | -------- | ---------------- | ------------------------- |
| list       | query    | HR+              | All employees (paginated) |
| getById    | query    | authed           | Single employee profile   |
| create     | mutation | HR_OFFICER/ADMIN | Create employee           |
| update     | mutation | HR_OFFICER/ADMIN | Update employee profile   |
| updateRole | mutation | ADMIN            | Change user role          |
| deactivate | mutation | ADMIN            | Soft-delete user          |

### attendance router

| Procedure       | Type     | Who          | Description                  |
| --------------- | -------- | ------------ | ---------------------------- |
| checkIn         | mutation | authed       | Log check-in timestamp       |
| checkOut        | mutation | authed       | Log check-out, compute hours |
| getMyLogs       | query    | authed       | Own attendance (date range)  |
| getAllLogs      | query    | HR+/PAYROLL+ | All employees (date range)   |
| getMonthSummary | query    | authed       | Monthly attendance summary   |

### leave router

| Procedure           | Type     | Who            | Description                |
| ------------------- | -------- | -------------- | -------------------------- |
| listTypes           | query    | authed         | All active leave types     |
| createType          | mutation | HR/ADMIN       | Add leave type             |
| allocate            | mutation | HR/ADMIN       | Allocate leave to employee |
| getBalance          | query    | authed         | Remaining leave balance    |
| apply               | mutation | authed         | Submit leave application   |
| getMyApplications   | query    | authed         | Own leave history          |
| getPendingApprovals | query    | PAYROLL/ADMIN  | All pending requests       |
| approve             | mutation | PAYROLL/ADMIN  | Approve leave              |
| reject              | mutation | PAYROLL/ADMIN  | Reject with reason         |
| cancel              | mutation | authed (owner) | Cancel own pending leave   |

### payroll router

| Procedure          | Type     | Who           | Description                   |
| ------------------ | -------- | ------------- | ----------------------------- |
| listComponents     | query    | PAYROLL/ADMIN | Salary component catalogue    |
| createComponent    | mutation | PAYROLL/ADMIN | Add component                 |
| setSalaryStructure | mutation | PAYROLL/ADMIN | Set basic + HRA for employee  |
| assignComponent    | mutation | PAYROLL/ADMIN | Add component to employee     |
| listPeriods        | query    | PAYROLL/ADMIN | Payroll period list           |
| createPeriod       | mutation | PAYROLL/ADMIN | Create payroll period         |
| runPayroll         | mutation | PAYROLL/ADMIN | Generate all slips for period |
| getPayrollEntry    | query    | PAYROLL/ADMIN | Payrun detail + all slips     |
| getMyPayslip       | query    | authed        | Own payslip for a period      |

### dashboard router

| Procedure            | Type  | Who           | Description                   |
| -------------------- | ----- | ------------- | ----------------------------- |
| getStats             | query | authed        | Role-scoped summary cards     |
| getAttendanceTrend   | query | HR+/ADMIN     | Monthly attendance chart data |
| getLeaveDistribution | query | HR+/ADMIN     | Leave by type chart data      |
| getPayrollTrend      | query | PAYROLL/ADMIN | Monthly payroll cost chart    |

---

## 6. Dev Stages

### Stage 0 — Foundation (Do First)

**Goal:** Runnable app with auth, DB, and role-based routing.

- [ ] Update `prisma/schema.prisma` with full schema (Sections 2.1–2.5 above)
- [ ] Run `prisma migrate dev` and seed PT slabs + default leave types
- [ ] Configure NextAuth credentials provider (`bcryptjs` for password hashing)
- [ ] Implement `auth` tRPC router: `register`, `login`, `me`
- [ ] Role guard middleware: `protectedProcedure(allowedRoles[])` in `src/server/api/trpc.ts`
- [ ] Build login + register pages (Tailwind, Zod form validation, inline error messages)
- [ ] Dashboard layout shell: sidebar with role-conditional nav items
- [ ] **Checkpoint:** Can register as Admin, log in, see role-gated sidebar

---

### Stage 1 — Employee & Settings Management

**Goal:** HR Officer can manage the workforce. Admin can configure the system.

- [ ] `employees` tRPC router (list, getById, create, update)
- [ ] `employee.service.ts` + `employee.repo.ts`
- [ ] Auto-generate `employeeCode` (EMP-001 sequence) in service
- [ ] Department + Designation CRUD (Admin only, inline in settings page)
- [ ] Employee directory page (table with search/filter by department)
- [ ] Employee profile page (view + edit form)
- [ ] Salary component catalogue CRUD (Admin/Payroll Officer)
- [ ] Assign salary structure to employee (basic + HRA)
- [ ] Assign additional components to employee
- [ ] **Checkpoint:** HR can create employees; Admin can set up pay components

---

### Stage 2 — Attendance Module

**Goal:** Employees mark check-in/out; HR can monitor attendance.

- [ ] `attendance` tRPC router (checkIn, checkOut, getMyLogs, getAllLogs, getMonthSummary)
- [ ] `attendance.service.ts`: derive status from working hours
- [ ] Prevent duplicate check-in on same day (enforce `@@unique([employeeId, date])`)
- [ ] Employee attendance page: today's status + monthly calendar heatmap
- [ ] HR/Admin: all-employees attendance table with date filter
- [ ] **Checkpoint:** Employee can check in/out; HR sees full attendance log

---

### Stage 3 — Leave Management

**Goal:** Full leave lifecycle from application to approval to ledger.

- [ ] `leave` tRPC router (full surface — see Section 5)
- [ ] `leave.service.ts`:
  - `calculateLeaveDays(from, to, isHalfDay)` — exclude weekends
  - `checkBalance(employeeId, leaveTypeId, days)` — before applying
  - `applyLeave()` — creates application + ledger debit on approval
  - `approveLeave()` — updates attendance records to ON_LEAVE for those dates
  - `cancelLeave()` — reverses ledger entry
- [ ] Leave types management page (HR)
- [ ] Leave allocation page (HR: assign quota per employee per year)
- [ ] Leave application form (Employee): date picker, type selector, balance preview
- [ ] My leaves page: application history + status badges
- [ ] Approvals queue (Payroll Officer): approve/reject with reason modal
- [ ] **Checkpoint:** Full leave workflow end-to-end

---

### Stage 4 — Payroll Module

**Goal:** Payroll Officer runs monthly payroll; employees see payslips.

- [ ] `payroll` tRPC router (full surface — see Section 5)
- [ ] `payroll.engine.ts`: implement calculation formula (Section 3 exactly)
- [ ] `payroll.utils.ts`: PT slab lookup function, PF_RATE = 0.12 constant
- [ ] `payroll.service.ts`: orchestrates engine, writes SalarySlip + SalarySlipDetail
- [ ] Payroll periods page: create period, view status
- [ ] Run Payroll action: triggers bulk slip generation for all active employees
- [ ] Payrun detail page: list of all slips, totals summary
- [ ] Individual payslip page: formatted breakdown (earnings table + deductions table + net)
- [ ] Employee payslip access: own slip only (gated by session)
- [ ] **Checkpoint:** Payroll Officer can run payroll; payslip shows correct math

---

### Stage 5 — Dashboard & Analytics

**Goal:** Role-scoped dashboards with summary cards + Recharts charts.

- [ ] `dashboard` tRPC router (getStats, getAttendanceTrend, getLeaveDistribution, getPayrollTrend)
- [ ] `dashboard.service.ts`: efficient aggregate SQL queries via Prisma
- [ ] Install Recharts: `npm install recharts`
- [ ] Dashboard page with role-conditional sections:
  - **All roles:** Today's attendance status card, leave balance card
  - **HR+:** Present today count, pending leave requests, headcount by dept (bar chart)
  - **HR+:** Monthly attendance trend (line chart: present vs absent per day)
  - **HR+:** Leave distribution by type (pie chart)
  - **Payroll+:** Last payrun summary card (total net, employee count)
  - **Payroll+:** Monthly payroll cost trend (bar chart, last 6 months)
  - **Admin:** Full overview — all of the above
- [ ] **Checkpoint:** Dashboard renders real data from DB, charts animate on load

---

### Stage 6 — Polish & Hardening

**Goal:** Production-ready quality for demo.

- [ ] Consistent Tailwind design system (color palette, spacing, typography)
- [ ] Loading skeletons on all async data (no layout shift)
- [ ] Empty states on all tables/lists
- [ ] Zod validation error messages surfaced inline on all forms
- [ ] Toast notifications for mutations (success/error)
- [ ] Confirm modals for destructive actions (reject leave, cancel payrun)
- [ ] Responsive layout (sidebar collapses on mobile)
- [ ] Seed script: realistic demo data (5 employees, 3 departments, 2 months of attendance + payroll)
- [ ] README with setup instructions and demo credentials
- [ ] **Checkpoint:** Clean demo run start-to-finish without errors

---

## 7. Key Business Rules (Non-Negotiable)

1. **Attendance uniqueness:** One record per employee per day. Check-in creates it; check-out updates it.
2. **Leave balance:** Validated before application is submitted. Cannot apply for more than remaining balance.
3. **Leave + Attendance sync:** Approving a leave sets `AttendanceRecord.status = ON_LEAVE` for each date in range.
4. **Payroll idempotency:** `runPayroll` is safe to call again — it upserts slips, does not create duplicates (`@@unique([employeeId, payrollPeriodId])`).
5. **Payroll period lock:** Once a PayrollPeriod is COMPLETED, no further mutations allowed on its slips.
6. **PF basis:** PF (12%) is calculated on `basicProrated` only, not gross salary.
7. **PT basis:** Professional Tax is looked up from slab against `grossSalary` (monthly equivalent).
8. **Unpaid leave:** If `LeaveType.isPaid = false`, those leave days do NOT count as `paidLeaveDays` in the payroll engine — they reduce `effectiveDays`.

---

## 8. Color Scheme & UI System

- **Primary:** `#7C3AED` (Odoo purple — matches problem statement branding)
- **Secondary:** `#F59E0B` (amber — matches PS highlight color)
- **Background:** `#F9FAFB` (gray-50)
- **Surface:** `#FFFFFF`
- **Text primary:** `#111827`
- **Text secondary:** `#6B7280`
- **Success:** `#10B981` · **Warning:** `#F59E0B` · **Error:** `#EF4444`
- **Font:** Inter (system-ui fallback)
- **Border radius:** `rounded-lg` (8px) as default
- **Sidebar width:** 240px fixed

Status badge colors:

- PENDING → amber · APPROVED → green · REJECTED → red · CANCELLED → gray
- PRESENT → green · HALF_DAY → amber · ABSENT → red · ON_LEAVE → blue
