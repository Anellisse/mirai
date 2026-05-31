import { PrismaClient } from '@prisma/client';
import { seedFrameworks } from './01-frameworks';
import { seedTestsCatalog } from './02-tests-catalog';
import { seedAdminUser } from './03-admin-user';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  await seedFrameworks(prisma);
  await seedTestsCatalog(prisma);
  await seedAdminUser(prisma);
  console.log('✅ Database seeded successfully');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
