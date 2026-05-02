# EmPay HRMS

EmPay is a role-based Human Resource Management System built with Next.js, tRPC, Prisma, PostgreSQL, NextAuth, Tailwind CSS, and Recharts.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure `.env.local`:

```bash
AUTH_SECRET="..."
DATABASE_URL="postgresql://..."
NODE_ENV="development"
```

Optional integrations:

```bash
RESEND_API_KEY="..."
EMAIL_FROM="..."
CLOUDINARY_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."
```

3. Push the Prisma schema:

```bash
npm run db:push
```

4. Seed demo data:

```bash
npm run db:seed
```

5. Start development:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Demo Credentials

Admin:

```text
admin@empay.com
Admin@123
```

Demo users created by the seed:

```text
hr.demo@empay.com
payroll.demo@empay.com
employee.demo1@empay.com
employee.demo2@empay.com
employee.demo3@empay.com
```

Password for demo users:

```text
Employee@123
```

## Demo Data

The seed script adds:

- 3 departments
- 5 demo employees
- salary structures and salary components
- leave types and 2026 leave allocations
- April and May 2026 attendance records
- April 2026 completed payroll
- May 2026 draft payroll period

## Main Flows

- Admin signup: `/register`
- Login: `/login`
- Dashboard: `/dashboard`
- Employees: `/dashboard/employees`
- Attendance: `/dashboard/attendance`
- Leave: `/dashboard/leave`
- Payroll: `/dashboard/payroll`
- Settings: `/dashboard/settings`

## Checks

```bash
npm run lint
npm run typecheck
npm run build
```
