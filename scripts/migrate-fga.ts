import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma";
import { CredentialsMethod, OpenFgaClient } from "@openfga/sdk";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const fgaClientOptions: Record<string, unknown> = {
  apiUrl: process.env.FGA_API_URL || "http://localhost:8080",
  storeId: process.env.FGA_STORE_ID,
  authorizationModelId: process.env.FGA_AUTHORIZATION_MODEL_ID,
};

// If Okta FGA credentials are set, use OIDC client-credentials flow
if (process.env.FGA_CLIENT_ID && process.env.FGA_CLIENT_SECRET) {
  fgaClientOptions.credentials = {
    method: CredentialsMethod.ClientCredentials,
    config: {
      apiTokenIssuer: process.env.FGA_API_TOKEN_ISSUER ?? "fga.us.auth0.com",
      apiAudience: process.env.FGA_API_AUDIENCE ?? "https://api.us1.fga.dev/",
      clientId: process.env.FGA_CLIENT_ID,
      clientSecret: process.env.FGA_CLIENT_SECRET,
    },
  };
}

const fgaClient = new OpenFgaClient(
  fgaClientOptions as ConstructorParameters<typeof OpenFgaClient>[0],
);

const CHUNK_SIZE = 40;

async function writeBatch(
  tuples: { user: string; relation: string; object: string }[],
  label: string,
) {
  for (let i = 0; i < tuples.length; i += CHUNK_SIZE) {
    const chunk = tuples.slice(i, i + CHUNK_SIZE);
    try {
      await fgaClient.write({ writes: chunk });
      console.log(
        `  ✅ ${label} chunk ${Math.floor(i / CHUNK_SIZE) + 1} (${chunk.length} tuples)`,
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("cannot write a tuple which already exists")) {
        console.log(
          `  ⏭️  ${label} chunk ${Math.floor(i / CHUNK_SIZE) + 1} — some tuples already exist, writing individually`,
        );
        for (const tuple of chunk) {
          try {
            await fgaClient.write({ writes: [tuple] });
          } catch (inner: unknown) {
            const innerMsg =
              inner instanceof Error ? inner.message : String(inner);
            if (
              !innerMsg.includes("cannot write a tuple which already exists")
            ) {
              console.error(`  ❌ Failed tuple:`, tuple, innerMsg);
            }
          }
        }
      } else {
        console.error(`  ❌ ${label} chunk ${Math.floor(i / CHUNK_SIZE) + 1} failed:`, msg);
      }
    }
  }
}

async function main() {
  if (!process.env.FGA_STORE_ID) {
    console.error("Error: FGA_STORE_ID is required to run the migration.");
    process.exit(1);
  }

  const dryRun = process.argv.includes("--dry-run");

  console.log("🔄 Starting full FGA migration...");
  if (dryRun) console.log("   (DRY RUN — no tuples will be written)\n");

  // ─── 1. Users & Company Roles ──────────────────────────────────────────────
  console.log("\n📦 Phase 1: Users & Company Roles");
  const roleTuples: { user: string; relation: string; object: string }[] = [];

  const users = await prisma.user.findMany({
    select: { id: true, role: true, companyId: true },
  });

  const roleRelationMap: Record<string, string> = {
    ADMIN: "admin",
    HR_OFFICER: "hr_officer",
    PAYROLL_OFFICER: "payroll_officer",
    EMPLOYEE: "employee",
  };

  for (const user of users) {
    if (!user.companyId) continue;
    const relation = roleRelationMap[user.role];
    if (relation) {
      roleTuples.push({
        user: `user:${user.id}`,
        relation,
        object: `company:${user.companyId}`,
      });
    }
  }

  console.log(`  Found ${roleTuples.length} role tuples`);
  if (!dryRun) await writeBatch(roleTuples, "Roles");

  // ─── 2. Employee Profiles ──────────────────────────────────────────────────
  console.log("\n📦 Phase 2: Employee Profiles");
  const profileTuples: { user: string; relation: string; object: string }[] =
    [];

  const employees = await prisma.employee.findMany({
    select: { id: true, userId: true, companyId: true },
  });

  for (const emp of employees) {
    if (!emp.companyId) continue;
    profileTuples.push({
      user: `user:${emp.userId}`,
      relation: "owner",
      object: `employee_profile:${emp.id}`,
    });
    profileTuples.push({
      user: `company:${emp.companyId}`,
      relation: "company",
      object: `employee_profile:${emp.id}`,
    });
  }

  console.log(`  Found ${profileTuples.length} profile tuples`);
  if (!dryRun) await writeBatch(profileTuples, "Profiles");

  // ─── 3. Attendance Records ─────────────────────────────────────────────────
  console.log("\n📦 Phase 3: Attendance Records");
  const attendanceTuples: {
    user: string;
    relation: string;
    object: string;
  }[] = [];

  const attendanceRecords = await prisma.attendanceRecord.findMany({
    select: {
      id: true,
      employee: {
        select: { userId: true, companyId: true },
      },
    },
  });

  for (const record of attendanceRecords) {
    if (!record.employee.companyId) continue;
    attendanceTuples.push({
      user: `user:${record.employee.userId}`,
      relation: "owner",
      object: `attendance_record:${record.id}`,
    });
    attendanceTuples.push({
      user: `company:${record.employee.companyId}`,
      relation: "company",
      object: `attendance_record:${record.id}`,
    });
  }

  console.log(`  Found ${attendanceTuples.length} attendance tuples`);
  if (!dryRun) await writeBatch(attendanceTuples, "Attendance");

  // ─── 4. Leave Allocations ──────────────────────────────────────────────────
  console.log("\n📦 Phase 4: Leave Allocations");
  const allocTuples: { user: string; relation: string; object: string }[] = [];

  const allocations = await prisma.leaveAllocation.findMany({
    select: {
      id: true,
      employee: {
        select: { userId: true, companyId: true },
      },
    },
  });

  for (const alloc of allocations) {
    if (!alloc.employee.companyId) continue;
    allocTuples.push({
      user: `user:${alloc.employee.userId}`,
      relation: "owner",
      object: `leave_allocation:${alloc.id}`,
    });
    allocTuples.push({
      user: `company:${alloc.employee.companyId}`,
      relation: "company",
      object: `leave_allocation:${alloc.id}`,
    });
  }

  console.log(`  Found ${allocTuples.length} allocation tuples`);
  if (!dryRun) await writeBatch(allocTuples, "Allocations");

  // ─── 5. Leave Applications ─────────────────────────────────────────────────
  console.log("\n📦 Phase 5: Leave Applications");
  const appTuples: { user: string; relation: string; object: string }[] = [];

  const applications = await prisma.leaveApplication.findMany({
    select: {
      id: true,
      employee: {
        select: { userId: true, companyId: true },
      },
    },
  });

  for (const app of applications) {
    if (!app.employee.companyId) continue;
    appTuples.push({
      user: `user:${app.employee.userId}`,
      relation: "owner",
      object: `leave_application:${app.id}`,
    });
    appTuples.push({
      user: `company:${app.employee.companyId}`,
      relation: "company",
      object: `leave_application:${app.id}`,
    });
  }

  console.log(`  Found ${appTuples.length} application tuples`);
  if (!dryRun) await writeBatch(appTuples, "Applications");

  // ─── 6. Salary Slips ───────────────────────────────────────────────────────
  console.log("\n📦 Phase 6: Salary Slips");
  const slipTuples: { user: string; relation: string; object: string }[] = [];

  const slips = await prisma.salarySlip.findMany({
    select: {
      id: true,
      employee: {
        select: { userId: true, companyId: true },
      },
    },
  });

  for (const slip of slips) {
    if (!slip.employee.companyId) continue;
    slipTuples.push({
      user: `user:${slip.employee.userId}`,
      relation: "owner",
      object: `salary_slip:${slip.id}`,
    });
    slipTuples.push({
      user: `company:${slip.employee.companyId}`,
      relation: "company",
      object: `salary_slip:${slip.id}`,
    });
  }

  console.log(`  Found ${slipTuples.length} slip tuples`);
  if (!dryRun) await writeBatch(slipTuples, "Slips");

  // ─── Summary ───────────────────────────────────────────────────────────────
  const total =
    roleTuples.length +
    profileTuples.length +
    attendanceTuples.length +
    allocTuples.length +
    appTuples.length +
    slipTuples.length;

  console.log(`\n🎉 FGA Migration complete! Total tuples: ${total}`);
  if (dryRun) console.log("   (DRY RUN — no tuples were written)");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
