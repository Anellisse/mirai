import { Injectable } from '@nestjs/common';
import { UserPayload } from '@mirai/shared-types';
import { PrismaService } from '../../prisma.service';
import { ReportsService } from '../reports/reports.service';

const WECHSLER_CODES = new Set(['WISC-V', 'WAIS-IV']);

const DESCRIPTOR_TO_SCORE: Record<string, number> = {
  'Extremadamente bajo': 1, 'Muy bajo': 1,
  'Limítrofe': 2, 'Bajo': 2,
  'Medio bajo': 3, 'Bajo el promedio': 3, 'Bajo promedio': 3,
  'Medio': 4, 'Promedio': 4,
  'Medio alto': 5, 'Alto': 5, 'Alto promedio': 5,
  'Superior': 6,
  'Muy alto': 7, 'Muy superior': 7,
};

const SCORE_TO_LABEL: Record<number, string> = {
  1: 'Muy bajo', 2: 'Limítrofe', 3: 'Bajo promedio',
  4: 'Promedio', 5: 'Alto promedio', 6: 'Superior', 7: 'Muy alto',
};

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

  async getCognitiveProfile(reportId: string, user: UserPayload) {
    await this.reportsService.checkEditAccess(reportId, user);

    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      select: {
        frameworkCode: true,
        selectedTests: true,
        testResults: {
          include: {
            test: {
              include: {
                domain: { select: { id: true, code: true, name: true, axis: true, orderIndex: true } },
              },
            },
          },
        },
      },
    });

    if (!report) return [];

    const domainScores: Map<string, { domainCode: string; domainName: string; axis: number | null; scores: number[] }> = new Map();

    for (const tr of report.testResults) {
      const domain = tr.test.domain;
      if (!domain) continue;
      if (!report.selectedTests.includes(tr.test.code)) continue;
      if (tr.test.type === 'questionnaire' || tr.test.type === 'social-cognition') continue;

      const descriptor = tr.descriptor;
      if (!descriptor) continue;

      const score = DESCRIPTOR_TO_SCORE[descriptor];
      if (score === undefined) continue;

      if (!domainScores.has(domain.id)) {
        domainScores.set(domain.id, { domainCode: domain.code, domainName: domain.name, axis: domain.axis, scores: [] });
      }
      domainScores.get(domain.id)!.scores.push(score);
    }

    return Array.from(domainScores.values()).map(({ domainCode, domainName, axis, scores }) => {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const rounded = Math.round(avg * 10) / 10;
      return {
        domainCode, domainName, axis,
        avgScore: rounded,
        descriptorLabel: SCORE_TO_LABEL[Math.round(avg)] ?? 'Sin datos',
      };
    }).sort((a, b) => (a.axis ?? 99) - (b.axis ?? 99));
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
