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

    const selectedTestCodes = (report?.selectedTests ?? []) as string[];
    if (selectedTestCodes.length === 0) return [];

    const includeSlots = {
      scoreSlots: {
        include: { descriptorScale: true },
        orderBy: { orderIndex: 'asc' as const },
      },
    };

    const [cognitiveTests, existingResults] = await Promise.all([
      this.prisma.cognitiveTest.findMany({
        where: { code: { in: selectedTestCodes } },
        include: includeSlots,
      }),
      this.prisma.testResult.findMany({
        where: { reportId },
        include: { test: { include: includeSlots } },
      }),
    ]);

    const existingByTestId = new Map(existingResults.map((r) => [r.testId, r]));

    return selectedTestCodes.flatMap((code) => {
      const test = cognitiveTests.find((t) => t.code === code);
      if (!test) return [];
      const existing = existingByTestId.get(test.id);
      if (existing) return [existing];
      return [{
        id: '',
        testId: test.id,
        reportId,
        scores: {} as Record<string, number | null>,
        rawScore: null,
        standardScore: null,
        scoreType: null,
        percentile: null,
        descriptor: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        test,
      }];
    });
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
