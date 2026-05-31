import { PrismaClient } from '@prisma/client';
import { seedFrameworks } from './01-frameworks';
import { seedTestsCatalog } from './02-tests-catalog';
import { seedAdminUser } from './03-admin-user';
import { seedDiagnosticCodes } from './04-diagnostic-codes';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  await seedFrameworks(prisma);
  await seedTestsCatalog(prisma);
  await seedAdminUser(prisma);
  await seedDiagnosticCodes(prisma);
  console.log('✅ Database seeded successfully');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
