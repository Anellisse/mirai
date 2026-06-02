import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class TestScoreSlotsService {
  constructor(private readonly prisma: PrismaService) {}

  findByTest(testId: string) {
    return this.prisma.testScoreSlot.findMany({
      where: { testId },
      include: { descriptorScale: true },
      orderBy: { orderIndex: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.testScoreSlot.findUnique({
      where: { id },
      include: { descriptorScale: { include: { ranges: { orderBy: { orderIndex: 'asc' } } } } },
    });
  }
}
