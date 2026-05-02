/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */

import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { type Role } from "../../../generated/prisma";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth();

  return {
    db,
    session,
    ...opts,
  };
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an artificial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    // artificial delay in dev
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        // infers the `session` as non-nullable
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  });

/**
 * Legacy role-based procedure guard (kept as a secondary defense-in-depth layer).
 */
export const roleProcedure = (allowedRoles: Role[]) =>
  protectedProcedure.use(({ ctx, next }) => {
    if (!allowedRoles.includes(ctx.session.user.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Requires one of: ${allowedRoles.join(", ")}`,
      });
    }

    return next({ ctx });
  });

// ---------------------------------------------------------------------------
// 4. Role-Based Authorization Procedures
// ---------------------------------------------------------------------------

export const permissionRoles = {
  can_view_employee_directory: [
    "ADMIN",
    "HR_OFFICER",
    "PAYROLL_OFFICER",
    "EMPLOYEE",
  ],
  can_manage_employees: ["ADMIN", "HR_OFFICER"],
  can_view_all_attendance: ["ADMIN", "HR_OFFICER", "PAYROLL_OFFICER"],
  can_manage_settings: ["ADMIN"],
  can_manage_payroll: ["ADMIN", "PAYROLL_OFFICER"],
  can_manage_leave_allocations: ["ADMIN", "HR_OFFICER"],
  can_approve_leave_applications: [
    "ADMIN",
    "HR_OFFICER",
  ],
  can_view_reports: ["ADMIN", "HR_OFFICER", "PAYROLL_OFFICER"],
  can_view_employee_profile: [
    "ADMIN",
    "HR_OFFICER",
    "PAYROLL_OFFICER",
    "EMPLOYEE",
  ],
  can_edit_employee_details: ["ADMIN", "HR_OFFICER"],
  can_edit_salary: ["ADMIN", "PAYROLL_OFFICER"],
  can_approve_leave_application: [
    "ADMIN",
    "HR_OFFICER",
  ],
  can_view_all_payslips: ["ADMIN", "PAYROLL_OFFICER"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof permissionRoles;

export function hasPermission(role: Role, permission: Permission) {
  return (permissionRoles[permission] as readonly Role[]).includes(role);
}

export function requirePermission(role: Role, permission: Permission) {
  if (!hasPermission(role, permission)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Access denied: requires "${permission}" permission`,
    });
  }
}

/**
 * Helper: resolve the companyId for the current user (cached per-request).
 */
async function resolveCompanyId(
  dbClient: typeof db,
  userId: string,
): Promise<string> {
  const user = await dbClient.user.findUnique({
    where: { id: userId },
    select: { companyId: true },
  });

  if (!user?.companyId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Company setup is required",
    });
  }

  return user.companyId;
}

/**
 * Company-scoped permission procedure.
 *
 * Checks the current user's role against a permission, resolves the user's
 * companyId automatically, and injects it into ctx.
 *
 * Usage:
 *   companyPermissionProcedure("can_manage_employees")
 *     .input(...)
 *     .mutation(({ ctx }) => { ... ctx.companyId is available ... })
 */
export const companyPermissionProcedure = (permission: Permission) =>
  protectedProcedure.use(async ({ ctx, next }) => {
    const companyId = await resolveCompanyId(ctx.db, ctx.session.user.id);

    requirePermission(ctx.session.user.role, permission);

    return next({
      ctx: {
        ...ctx,
        companyId,
      },
    });
  });

/**
 * Protected procedure with companyId injected into context.
 * Used for self-service procedures that don't need permission checks
 * but benefit from having companyId available.
 */
export const protectedWithCompanyProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    const companyId = await resolveCompanyId(ctx.db, ctx.session.user.id);
    return next({
      ctx: {
        ...ctx,
        companyId,
      },
    });
  },
);
