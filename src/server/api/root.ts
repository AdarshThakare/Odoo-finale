import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { attendanceRouter } from "~/server/api/routers/attendance";
import { authRouter } from "~/server/api/routers/auth";
import { chatRouter } from "~/server/api/routers/chat";
import { dashboardRouter } from "~/server/api/routers/dashboard";
import { employeeRouter } from "~/server/api/routers/employee";
import { leaveRouter } from "~/server/api/routers/leave";
import { payrollRouter } from "~/server/api/routers/payroll";
import { settingsRouter } from "~/server/api/routers/settings";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  attendance: attendanceRouter,
  auth: authRouter,
  chat: chatRouter,
  dashboard: dashboardRouter,
  employee: employeeRouter,
  leave: leaveRouter,
  payroll: payrollRouter,
  settings: settingsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
