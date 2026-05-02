import { z } from "zod";

import { createTRPCRouter, protectedProcedure, roleProcedure } from "~/server/api/trpc";
import {
	checkInForUser,
	checkOutForUser,
	getAllAttendanceForUser,
	getMyAttendanceForUser,
} from "~/server/modules/attendance/attendance.service";

const managerRoles = ["ADMIN", "HR_OFFICER", "PAYROLL_OFFICER"] as const;

export const attendanceRouter = createTRPCRouter({
	getMyAttendance: protectedProcedure
		.input(z.object({ month: z.string().optional() }).optional())
		.query(async ({ ctx, input }) => {
			return getMyAttendanceForUser(ctx.db, ctx.session.user.id, input?.month);
		}),

	getAllAttendance: roleProcedure([...managerRoles])
		.input(
			z.object({
				date: z.string().optional(),
				search: z.string().optional(),
			}).optional(),
		)
		.query(async ({ ctx, input }) => {
			return getAllAttendanceForUser(
				ctx.db,
				ctx.session.user.id,
				input?.date,
				input?.search,
			);
		}),

	checkIn: protectedProcedure.mutation(async ({ ctx }) => {
		return checkInForUser(ctx.db, ctx.session.user.id);
	}),

	checkOut: protectedProcedure.mutation(async ({ ctx }) => {
		return checkOutForUser(ctx.db, ctx.session.user.id);
	}),
});