import { PrismaClient } from '../generated/prisma';
import { OpenFgaClient } from '@openfga/sdk';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const fgaClient = new OpenFgaClient({
  apiUrl: process.env.FGA_API_URL || 'http://localhost:8080',
  storeId: process.env.FGA_STORE_ID,
  authorizationModelId: process.env.FGA_AUTHORIZATION_MODEL_ID,
});

async function main() {
  if (!process.env.FGA_STORE_ID) {
    console.error('Error: FGA_STORE_ID is required to run the migration.');
    process.exit(1);
  }

  console.log('🔄 Starting migration to OpenFGA...');
  const writes = [];

  // 1. Migrate Users & Roles
  console.log('Migrating Users and Roles...');
  const users = await prisma.user.findMany({ include: { employee: true } });
  
  for (const user of users) {
    if (!user.companyId) continue;
    
    // Map Prisma Role to FGA Relation
    const roleRelationMap: Record<string, string> = {
      'ADMIN': 'admin',
      'HR_OFFICER': 'hr_officer',
      'PAYROLL_OFFICER': 'payroll_officer',
      'EMPLOYEE': 'employee',
    };
    
    const relation = roleRelationMap[user.role];
    if (relation) {
      writes.push({
        user: `user:${user.id}`,
        relation: relation,
        object: `company:${user.companyId}`,
      });
    }

    // Link Employee Profiles
    if (user.employee) {
      writes.push({
        user: `user:${user.id}`,
        relation: 'owner',
        object: `employee_profile:${user.employee.id}`,
      });
      writes.push({
        user: `company:${user.companyId}`,
        relation: 'company',
        object: `employee_profile:${user.employee.id}`,
      });
    }
  }

  // Execute writes in batches (Max 100 per FGA standard)
  for (let i = 0; i < writes.length; i += 50) {
    const chunk = writes.slice(i, i + 50);
    try {
      await fgaClient.write({ writes: chunk });
      console.log(`✅ Wrote chunk ${i / 50 + 1}`);
    } catch (e: any) {
      console.error(`❌ Failed chunk ${i / 50 + 1}`, e.message);
    }
  }

  console.log('🎉 FGA Migration complete!');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
