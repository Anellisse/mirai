import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UserPayload } from '@mirai/shared-types';
import { PrismaService } from '../../prisma.service';
import { ReportsService } from '../reports/reports.service';
import { UpsertScoresDto } from './dto/upsert-scores.dto';

@Injectable()
export class EvaluationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportsService: ReportsService,
  ) {}

  async getTestResults(reportId: string, user: UserPayload) {
    await this.reportsService.checkEditAccess(reportId, user);

    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      select: { selectedTests: true },
    });

    const selectedTests = report?.selectedTests ?? [];

    return this.prisma.testResult.findMany({
      where: { reportId },
      include: {
        test: {
          include: {
            scoreSlots: {
              include: { descriptorScale: true },
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }).then((results) =>
      results.filter((r) => selectedTests.includes(r.test.code)),
    );
  }

  async upsertScores(reportId: string, testId: string, dto: UpsertScoresDto, user: UserPayload) {
    await this.reportsService.checkEditAccess(reportId, user);

    const existing = await this.prisma.testResult.findUnique({
      where: { reportId_testId: { reportId, testId } },
    });

    const scores = dto.scores as Prisma.InputJsonValue;

    if (existing) {
      return this.prisma.testResult.update({
        where: { id: existing.id },
        data: { scores, updatedAt: new Date() },
      });
    }

    return this.prisma.testResult.create({
      data: { reportId, testId, scores },
    });
  }
}
