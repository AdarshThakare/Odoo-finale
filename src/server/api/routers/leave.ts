import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  roleProcedure,
} from "~/server/api/trpc";
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

const hrRoles = ["ADMIN", "HR_OFFICER"] as const;
const approverRoles = ["ADMIN", "PAYROLL_OFFICER"] as const;
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

export const leaveRouter = createTRPCRouter({
  listTypes: protectedProcedure.query(({ ctx }) => listLeaveTypes(ctx.db)),

  createType: roleProcedure([...hrRoles])
    .input(
      z.object({
        name: z.string().min(2, "Name is required"),
        maxDaysPerYear: z.number().int().positive(),
        isPaid: z.boolean(),
        carryForward: z.boolean(),
      }),
    )
    .mutation(({ ctx, input }) => addLeaveType(ctx.db, input)),

  allocate: roleProcedure([...hrRoles])
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

  getBalance: protectedProcedure.query(({ ctx }) =>
    getLeaveBalances(ctx.db, ctx.session.user.id),
  ),

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

  getMyApplications: protectedProcedure.query(({ ctx }) =>
    getMyLeaveApplications(ctx.db, ctx.session.user.id),
  ),

  getPendingApprovals: roleProcedure([...approverRoles]).query(({ ctx }) =>
    getPendingApprovals(ctx.db, ctx.session.user.id),
  ),

  getAllApprovals: roleProcedure([...approverRoles]).query(({ ctx }) =>
    getAllApprovals(ctx.db, ctx.session.user.id),
  ),

  approve: roleProcedure([...approverRoles])
    .input(z.object({ applicationId: z.string().min(1) }))
    .mutation(({ ctx, input }) =>
      approveLeaveApplication(ctx.db, ctx.session.user.id, input.applicationId),
    ),

  reject: roleProcedure([...approverRoles])
    .input(
      z.object({
        applicationId: z.string().min(1),
        reason: z.string().min(5, "Please provide a rejection reason"),
      }),
    )
    .mutation(({ ctx, input }) =>
      rejectLeaveApplication(
        ctx.db,
        ctx.session.user.id,
        input.applicationId,
        input.reason,
      ),
    ),

  cancel: protectedProcedure
    .input(z.object({ applicationId: z.string().min(1) }))
    .mutation(({ ctx, input }) =>
      cancelLeaveApplication(ctx.db, ctx.session.user.id, input.applicationId),
    ),
});
