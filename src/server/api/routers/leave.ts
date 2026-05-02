import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  createTRPCRouter,
  fgaCompanyProcedure,
  protectedProcedure,
} from "~/server/api/trpc";
import { checkAccess } from "~/lib/fga";
import {
  addLeaveType,
  allocateLeave,
  applyForLeave,
  approveLeaveApplication,
  cancelLeaveApplication,
  getAllApprovals,
  getLeaveBalances,
  getMyLeaveApplications,
  getPendingApprovals,
  listLeaveTypes,
  rejectLeaveApplication,
} from "~/server/modules/leave/leave.service";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

export const leaveRouter = createTRPCRouter({
  /**
   * List all leave types.
   * All authenticated users can view leave types.
   */
  listTypes: protectedProcedure.query(({ ctx }) => listLeaveTypes(ctx.db)),

  /**
   * Create a new leave type.
   * FGA: can_manage_leave_allocations on company:{companyId}
   */
  createType: fgaCompanyProcedure("can_manage_leave_allocations")
    .input(
      z.object({
        name: z.string().min(2, "Name is required"),
        maxDaysPerYear: z.number().int().positive(),
        isPaid: z.boolean(),
        carryForward: z.boolean(),
      }),
    )
    .mutation(({ ctx, input }) => addLeaveType(ctx.db, input)),

  /**
   * Allocate leave to an employee.
   * FGA: can_manage_leave_allocations on company:{companyId}
   */
  allocate: fgaCompanyProcedure("can_manage_leave_allocations")
    .input(
      z.object({
        employeeId: z.string().min(1),
        leaveTypeId: z.string().min(1),
        year: z.number().int().min(2020).max(2100),
        totalDays: z.number().int().positive(),
      }),
    )
    .mutation(({ ctx, input }) =>
      allocateLeave(ctx.db, ctx.session.user.id, input),
    ),

  /**
   * Get the current user's leave balances.
   * Self-service — no FGA check needed.
   */
  getBalance: protectedProcedure.query(({ ctx }) =>
    getLeaveBalances(ctx.db, ctx.session.user.id),
  ),

  /**
   * Apply for leave.
   * Self-service — no FGA check needed.
   */
  applyForLeave: protectedProcedure
    .input(
      z.object({
        leaveTypeId: z.string().min(1),
        fromDate: isoDateSchema,
        toDate: isoDateSchema,
        isHalfDay: z.boolean(),
        halfDayDate: isoDateSchema.optional(),
        reason: z.string().min(5, "Please provide a reason"),
      }),
    )
    .mutation(({ ctx, input }) =>
      applyForLeave(ctx.db, ctx.session.user.id, input),
    ),

  /**
   * Get the current user's own leave applications.
   * Self-service — no FGA check needed.
   */
  getMyApplications: protectedProcedure.query(({ ctx }) =>
    getMyLeaveApplications(ctx.db, ctx.session.user.id),
  ),

  /**
   * Get all pending leave approval requests.
   * FGA: can_approve_leave_applications on company:{companyId}
   */
  getPendingApprovals: fgaCompanyProcedure(
    "can_approve_leave_applications",
  ).query(({ ctx }) => getPendingApprovals(ctx.db, ctx.session.user.id)),

  /**
   * Get all leave approvals (history).
   * FGA: can_approve_leave_applications on company:{companyId}
   */
  getAllApprovals: fgaCompanyProcedure(
    "can_approve_leave_applications",
  ).query(({ ctx }) => getAllApprovals(ctx.db, ctx.session.user.id)),

  /**
   * Approve a leave application.
   * FGA: can_approve on leave_application:{applicationId}
   */
  approve: protectedProcedure
    .input(z.object({ applicationId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const allowed = await checkAccess(
        ctx.session.user.id,
        "can_approve",
        "leave_application",
        input.applicationId,
      );

      if (!allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to approve this leave application",
        });
      }

      return approveLeaveApplication(
        ctx.db,
        ctx.session.user.id,
        input.applicationId,
      );
    }),

  /**
   * Reject a leave application.
   * FGA: can_approve on leave_application:{applicationId}
   */
  reject: protectedProcedure
    .input(
      z.object({
        applicationId: z.string().min(1),
        reason: z.string().min(5, "Please provide a rejection reason"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const allowed = await checkAccess(
        ctx.session.user.id,
        "can_approve",
        "leave_application",
        input.applicationId,
      );

      if (!allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to reject this leave application",
        });
      }

      return rejectLeaveApplication(
        ctx.db,
        ctx.session.user.id,
        input.applicationId,
        input.reason,
      );
    }),

  /**
   * Cancel a leave application (owner only).
   * FGA: can_view on leave_application:{applicationId} (ensures ownership)
   */
  cancel: protectedProcedure
    .input(z.object({ applicationId: z.string().min(1) }))
    .mutation(({ ctx, input }) =>
      cancelLeaveApplication(ctx.db, ctx.session.user.id, input.applicationId),
    ),
});
