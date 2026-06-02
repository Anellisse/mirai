import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class DescriptorScalesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.descriptorScale.findMany({
      include: { ranges: { orderBy: { orderIndex: 'asc' } } },
      orderBy: { code: 'asc' },
    });
  }

  findOne(code: string) {
    return this.prisma.descriptorScale.findUnique({
      where: { code },
      include: { ranges: { orderBy: { orderIndex: 'asc' } } },
    });
  }
}
