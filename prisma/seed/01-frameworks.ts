import { PrismaClient } from '@prisma/client';
import { FRAMEWORKS } from '../../packages/clinical-constants/src';

export async function seedFrameworks(prisma: PrismaClient) {
  for (const fw of FRAMEWORKS) {
    const framework = await prisma.evaluationFrameworkConfig.upsert({
      where: { code: fw.code },
      update: { name: fw.name },
      create: { code: fw.code, name: fw.name },
    });

    for (const domain of fw.domains) {
      await prisma.cognitiveDomain.upsert({
        where: { id: `${fw.code}_${domain.code}` },
        update: { name: domain.name, axis: domain.axis, orderIndex: domain.orderIndex },
        create: {
          id: `${fw.code}_${domain.code}`,
          frameworkId: framework.id,
          code: domain.code,
          name: domain.name,
          axis: domain.axis ?? null,
          orderIndex: domain.orderIndex,
        },
      });
    }
  }
  console.log('✓ Frameworks and domains seeded');
}
