import { Injectable } from '@nestjs/common';
import { UserPayload } from '@mirai/shared-types';
import { PrismaService } from '../../prisma.service';
import { ReportsService } from '../reports/reports.service';

const WECHSLER_CODES = new Set(['WISC-V', 'WAIS-IV']);

export type WechslerIndexRow = {
  testCode: string; testName: string;
  slotKey: string; slotName: string;
  standardScore: number | null; percentile: number | null; descriptor: string | null;
};

export type WechslerSubtestRow = {
  testCode: string; testName: string;
  slotKey: string; slotName: string;
  scaledScore: number | null; descriptor: string | null;
};

export type BatteryRow = {
  testCode: string; testName: string;
  slotKey: string; slotName: string;
  score: number | null; scoreType: string; percentile: number | null; descriptor: string | null;
};

export type QuestionnaireRow = {
  testCode: string; testName: string;
  slotKey: string; slotName: string;
  rawScore: number | null; classification: string | null;
};

export type AnnexTablesResult = {
  wechslerIndices: WechslerIndexRow[];
  wechslerSubtests: WechslerSubtestRow[];
  battery: BatteryRow[];
  questionnaires: QuestionnaireRow[];
};

@Injectable()
export class AnnexTablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportsService: ReportsService,
  ) {}

  async getAnnexTables(reportId: string, user: UserPayload): Promise<AnnexTablesResult> {
    await this.reportsService.checkEditAccess(reportId, user);

    const testResults = await this.prisma.testResult.findMany({
      where: { reportId },
      include: {
        test: {
          include: {
            scoreSlots: { orderBy: { orderIndex: 'asc' } },
          },
        },
      },
    });

    const result: AnnexTablesResult = {
      wechslerIndices: [],
      wechslerSubtests: [],
      battery: [],
      questionnaires: [],
    };

    for (const tr of testResults) {
      const test = tr.test;
      const scores = tr.scores as Record<string, number | null>;
      const isWechsler = WECHSLER_CODES.has(test.code);

      for (const slot of test.scoreSlots) {
        const rawVal = scores[slot.key] ?? null;

        if (test.type === 'questionnaire') {
          const classification = this.classifyQuestionnaire(rawVal, slot);
          result.questionnaires.push({
            testCode: test.code, testName: test.name,
            slotKey: slot.key, slotName: slot.name,
            rawScore: rawVal, classification,
          });
        } else if (isWechsler && slot.scoreType === 'SS') {
          result.wechslerIndices.push({
            testCode: test.code, testName: test.name,
            slotKey: slot.key, slotName: slot.name,
            standardScore: rawVal, percentile: tr.percentile ?? null, descriptor: tr.descriptor ?? null,
          });
        } else if (slot.scoreType === 'SCALED') {
          result.wechslerSubtests.push({
            testCode: test.code, testName: test.name,
            slotKey: slot.key, slotName: slot.name,
            scaledScore: rawVal, descriptor: null,
          });
        } else {
          result.battery.push({
            testCode: test.code, testName: test.name,
            slotKey: slot.key, slotName: slot.name,
            score: rawVal, scoreType: slot.scoreType, percentile: null, descriptor: tr.descriptor ?? null,
          });
        }
      }
    }

    return result;
  }

  private classifyQuestionnaire(
    value: number | null,
    slot: { cutoffBorderline: number | null; cutoffClinicallySignificant: number | null },
  ): string | null {
    if (value === null) return null;
    if (slot.cutoffClinicallySignificant !== null && value >= slot.cutoffClinicallySignificant) {
      return 'Clínicamente significativo';
    }
    if (slot.cutoffBorderline !== null && value >= slot.cutoffBorderline) {
      return 'Limítrofe';
    }
    return 'Normal';
  }
}
