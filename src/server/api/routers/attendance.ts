import { z } from "zod";

import {
  createTRPCRouter,
  companyPermissionProcedure,
  protectedProcedure,
} from "~/server/api/trpc";
import {
  checkInForUser,
  checkOutForUser,
  getAllAttendanceForUser,
  getMyAttendanceForUser,
  getTodayAttendanceSummary,
} from "~/server/modules/attendance/attendance.service";

export const attendanceRouter = createTRPCRouter({
  /**
   * Get the current user's own attendance records.
   * Self-service — no RBAC check needed (service layer scopes by user).
   */
  getMyAttendance: protectedProcedure
    .input(z.object({ month: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return getMyAttendanceForUser(ctx.db, ctx.session.user.id, input?.month);
    }),

  /**
   * Get all attendance records across the company.
   * RBAC: can_view_all_attendance on company:{companyId}
   */
  getAllAttendance: companyPermissionProcedure("can_view_all_attendance")
    .input(
      z
        .object({
          date: z.string().optional(),
          search: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return getAllAttendanceForUser(
        ctx.db,
        ctx.session.user.id,
        input?.date,
        input?.search,
      );
    }),

  /**
   * Check in for the current user.
   * Self-service — no RBAC check needed.
   */
  checkIn: protectedProcedure.mutation(async ({ ctx }) => {
    return checkInForUser(ctx.db, ctx.session.user.id);
  }),

  /**
   * Check out for the current user.
   * Self-service — no RBAC check needed.
   */
  checkOut: protectedProcedure.mutation(async ({ ctx }) => {
    return checkOutForUser(ctx.db, ctx.session.user.id);
  }),

  /**
   * Get today's attendance summary: which employee IDs are present or in-progress.
   * Used by the employee directory to show the attendance dot.
   * RBAC: can_view_all_attendance
   */
  getTodaySummary: companyPermissionProcedure("can_view_all_attendance").query(
    async ({ ctx }) => {
      return getTodayAttendanceSummary(ctx.db, ctx.session.user.id);
    },
  ),
});