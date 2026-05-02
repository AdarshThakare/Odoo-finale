/**
 * FGA Tuple Sync — writes relationship tuples at mutation time.
 *
 * Called from tRPC routers / service layer whenever data that is
 * modelled in OpenFGA is created or updated.
 */

import { writeTuple, writeTuples } from "./fga";

// ── Company Role ──────────────────────────────────────────────────────────────

const ROLE_RELATION_MAP: Record<string, string> = {
  ADMIN: "admin",
  HR_OFFICER: "hr_officer",
  PAYROLL_OFFICER: "payroll_officer",
  EMPLOYEE: "employee",
};

/**
 * Write the company-level role tuple for a user.
 * e.g. user:abc → admin → company:xyz
 */
export async function syncUserRole(
  userId: string,
  role: string,
  companyId: string,
): Promise<void> {
  const relation = ROLE_RELATION_MAP[role];
  if (!relation) return;

  await writeTuple(`user:${userId}`, relation, `company:${companyId}`);
}

// ── Employee Profile ──────────────────────────────────────────────────────────

/**
 * Write owner + company tuples for a new employee profile.
 */
export async function syncNewEmployee(
  userId: string,
  employeeId: string,
  companyId: string,
): Promise<void> {
  await writeTuples([
    {
      user: `user:${userId}`,
      relation: "owner",
      object: `employee_profile:${employeeId}`,
    },
    {
      user: `company:${companyId}`,
      relation: "company",
      object: `employee_profile:${employeeId}`,
    },
  ]);
}

// ── Attendance Record ─────────────────────────────────────────────────────────

/**
 * Write owner + company tuples for a new attendance record.
 */
export async function syncNewAttendance(
  userId: string,
  attendanceId: string,
  companyId: string,
): Promise<void> {
  await writeTuples([
    {
      user: `user:${userId}`,
      relation: "owner",
      object: `attendance_record:${attendanceId}`,
    },
    {
      user: `company:${companyId}`,
      relation: "company",
      object: `attendance_record:${attendanceId}`,
    },
  ]);
}

// ── Leave Allocation ──────────────────────────────────────────────────────────

/**
 * Write owner + company tuples for a new leave allocation.
 */
export async function syncNewLeaveAllocation(
  userId: string,
  allocationId: string,
  companyId: string,
): Promise<void> {
  await writeTuples([
    {
      user: `user:${userId}`,
      relation: "owner",
      object: `leave_allocation:${allocationId}`,
    },
    {
      user: `company:${companyId}`,
      relation: "company",
      object: `leave_allocation:${allocationId}`,
    },
  ]);
}

// ── Leave Application ─────────────────────────────────────────────────────────

/**
 * Write owner + company tuples for a new leave application.
 */
export async function syncNewLeaveApplication(
  userId: string,
  applicationId: string,
  companyId: string,
): Promise<void> {
  await writeTuples([
    {
      user: `user:${userId}`,
      relation: "owner",
      object: `leave_application:${applicationId}`,
    },
    {
      user: `company:${companyId}`,
      relation: "company",
      object: `leave_application:${applicationId}`,
    },
  ]);
}

// ── Salary Slip ───────────────────────────────────────────────────────────────

/**
 * Write owner + company tuples for a new salary slip.
 */
export async function syncNewSalarySlip(
  userId: string,
  slipId: string,
  companyId: string,
): Promise<void> {
  await writeTuples([
    {
      user: `user:${userId}`,
      relation: "owner",
      object: `salary_slip:${slipId}`,
    },
    {
      user: `company:${companyId}`,
      relation: "company",
      object: `salary_slip:${slipId}`,
    },
  ]);
}
