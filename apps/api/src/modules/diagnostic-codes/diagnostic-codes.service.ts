import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class DiagnosticCodesService {
  constructor(private readonly prisma: PrismaService) {}

  search({ q, category }: { q?: string; category?: string }) {
    const where: Record<string, unknown> = { isActive: true };
    if (category) where.category = category;
    if (q) where.name = { contains: q, mode: 'insensitive' };
    return this.prisma.diagnosticCode.findMany({ where, orderBy: { code: 'asc' } });
  }
}
