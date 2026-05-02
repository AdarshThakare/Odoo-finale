import { type Prisma, type PrismaClient } from "../../../generated/prisma";

export async function getAttendanceForEmployeeMonth(
	db: PrismaClient,
	employeeId: string,
	startDate: Date,
	endDate: Date,
) {
	return db.attendanceRecord.findMany({
		where: {
			employeeId,
			date: {
				gte: startDate,
				lt: endDate,
			},
		},
		orderBy: { date: "asc" },
		select: {
			date: true,
			checkIn: true,
			checkOut: true,
			workingHours: true,
			status: true,
			notes: true,
		},
	});
}

export async function getAttendanceForCompanyDate(
	db: PrismaClient,
	companyId: string,
	date: Date,
	search?: string,
) {
	const where: Prisma.EmployeeWhereInput = {
		companyId,
	};

	if (search) {
		const query = search.trim();
		if (query.length > 0) {
			where.OR = [
				{ firstName: { contains: query, mode: "insensitive" } },
				{ lastName: { contains: query, mode: "insensitive" } },
				{ employeeCode: { contains: query, mode: "insensitive" } },
				{
					user: {
						is: {
							email: { contains: query, mode: "insensitive" },
						},
					},
				},
				{
					user: {
						is: {
							loginId: { contains: query, mode: "insensitive" },
						},
					},
				},
			];
		}
	}

	return db.employee.findMany({
		where,
		orderBy: { firstName: "asc" },
		select: {
			id: true,
			employeeCode: true,
			firstName: true,
			lastName: true,
			user: {
				select: {
					email: true,
					loginId: true,
					role: true,
				},
			},
			department: { select: { name: true } },
			designation: { select: { name: true } },
			attendanceRecords: {
				where: { date },
				select: {
					date: true,
					checkIn: true,
					checkOut: true,
					workingHours: true,
					status: true,
					notes: true,
				},
			},
		},
	});
}

export async function getAttendanceRecordForEmployeeDate(
	db: PrismaClient,
	employeeId: string,
	date: Date,
) {
	return db.attendanceRecord.findUnique({
		where: {
			employeeId_date: {
				employeeId,
				date,
			},
		},
		select: {
			id: true,
			date: true,
			checkIn: true,
			checkOut: true,
			workingHours: true,
			status: true,
			notes: true,
		},
	});
}

export async function createAttendanceRecord(
	db: PrismaClient,
	input: {
		employeeId: string;
		date: Date;
		checkIn: Date;
		status: "ABSENT" | "PRESENT" | "HALF_DAY" | "ON_LEAVE";
	},
) {
	return db.attendanceRecord.create({
		data: {
			employeeId: input.employeeId,
			date: input.date,
			checkIn: input.checkIn,
			status: input.status,
		},
		select: {
			id: true,
			date: true,
			checkIn: true,
			checkOut: true,
			workingHours: true,
			status: true,
			notes: true,
		},
	});
}

export async function updateAttendanceRecord(
	db: PrismaClient,
	recordId: string,
	data: {
		checkOut: Date;
		workingHours: Prisma.Decimal;
		status: "ABSENT" | "PRESENT" | "HALF_DAY" | "ON_LEAVE";
	},
) {
	return db.attendanceRecord.update({
		where: { id: recordId },
		data,
		select: {
			id: true,
			date: true,
			checkIn: true,
			checkOut: true,
			workingHours: true,
			status: true,
			notes: true,
		},
	});
}