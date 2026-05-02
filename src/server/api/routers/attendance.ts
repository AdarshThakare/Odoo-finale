import { z } from "zod";

import {
  createTRPCRouter,
  fgaCompanyProcedure,
  protectedProcedure,
} from "~/server/api/trpc";
import {
  checkInForUser,
  checkOutForUser,
  getAllAttendanceForUser,
  getMyAttendanceForUser,
} from "~/server/modules/attendance/attendance.service";

export const attendanceRouter = createTRPCRouter({
  /**
   * Get the current user's own attendance records.
   * Self-service — no FGA check needed (service layer scopes by user).
   */
  getMyAttendance: protectedProcedure
    .input(z.object({ month: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return getMyAttendanceForUser(ctx.db, ctx.session.user.id, input?.month);
    }),

  /**
   * Get all attendance records across the company.
   * FGA: can_view_all_attendance on company:{companyId}
   */
  getAllAttendance: fgaCompanyProcedure("can_view_all_attendance")
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
   * Self-service — no FGA check needed.
   */
  checkIn: protectedProcedure.mutation(async ({ ctx }) => {
    return checkInForUser(ctx.db, ctx.session.user.id);
  }),

  /**
   * Check out for the current user.
   * Self-service — no FGA check needed.
   */
  checkOut: protectedProcedure.mutation(async ({ ctx }) => {
    return checkOutForUser(ctx.db, ctx.session.user.id);
  }),
});