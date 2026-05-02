import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  getAdminWarnings,
  getAttendanceTrend,
  getDashboardStats,
  getHeadcountByDepartment,
  getLeaveDistribution,
  getPayrollTrend,
  getRecentPayruns,
} from "~/server/modules/dashboard/dashboard.service";

export const dashboardRouter = createTRPCRouter({
  getStats: protectedProcedure.query(({ ctx }) =>
    getDashboardStats(ctx.db, ctx.session.user.id),
  ),
  getAttendanceTrend: protectedProcedure.query(({ ctx }) =>
    getAttendanceTrend(ctx.db, ctx.session.user.id),
  ),
  getLeaveDistribution: protectedProcedure.query(({ ctx }) =>
    getLeaveDistribution(ctx.db, ctx.session.user.id),
  ),
  getPayrollTrend: protectedProcedure.query(({ ctx }) =>
    getPayrollTrend(ctx.db, ctx.session.user.id),
  ),
  getHeadcountByDepartment: protectedProcedure.query(({ ctx }) =>
    getHeadcountByDepartment(ctx.db, ctx.session.user.id),
  ),
  getAdminWarnings: protectedProcedure.query(({ ctx }) =>
    getAdminWarnings(ctx.db, ctx.session.user.id),
  ),
  getRecentPayruns: protectedProcedure.query(({ ctx }) =>
    getRecentPayruns(ctx.db, ctx.session.user.id),
  ),
});
