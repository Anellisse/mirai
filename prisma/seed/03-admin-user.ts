import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function seedAdminUser(prisma: PrismaClient) {
  const org = await prisma.organization.upsert({
    where: { id: 'org_neuropsia' },
    update: {},
    create: {
      id: 'org_neuropsia',
      name: 'Centro Neuropsia',
      subtitle: 'Neuropsicología Clínica',
    },
  });

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@neuropsia.cl';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMeNow2024!';

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      name: 'Administrador',
      role: 'SUPER_ADMIN',
      organizationId: org.id,
    },
  });
  console.log(`✓ Admin user created: ${adminEmail}`);
  console.log('  ⚠️  Change the password immediately after first login');
}
