import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SectionType } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { DescriptorService } from './descriptor.service';
import { DictionaryService } from './dictionary.service';
import { NormativeService } from './normative.service';
import { SectionTypeEnum } from './dto/generate-sections.dto';

type UserPayload = { sub: string; organizationId: string };

type DomainResult = { domainName: string; lowestLabel: string };

@Injectable()
export class RulesEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly normative: NormativeService,
    private readonly descriptor: DescriptorService,
    private readonly dictionary: DictionaryService,
  ) {}

  async generateSections(
    reportId: string,
    sections: SectionTypeEnum[],
    user: UserPayload,
  ) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: {
        patient: true,
        testResults: { include: { test: { include: { scoreSlots: { include: { descriptorScale: { include: { ranges: { orderBy: { orderIndex: 'asc' } } } } } } } } } },
      },
    });
    if (!report) throw new NotFoundException('Informe no encontrado');
    if (report.organizationId !== user.organizationId) throw new ForbiddenException();

    const results: Record<string, string> = {};

    for (const section of sections) {
      await this.assertSectionNotApproved(reportId, section);

      let content = '';
      if (section === SectionTypeEnum.COGNITIVE_EVALUATION) {
        content = await this.generateCognitiveEvaluation(report);
      } else if (section === SectionTypeEnum.QUESTIONNAIRE_SYMPTOMS) {
        content = await this.generateQuestionnaires(report);
      } else if (section === SectionTypeEnum.SOCIAL_COGNITION) {
        content = await this.generateSocialCognition(report);
      } else if (section === SectionTypeEnum.RESULTS_SYNTHESIS) {
        content = await this.generateSynthesis(report);
      }

      await this.prisma.reportSection.upsert({
        where: { reportId_sectionType: { reportId, sectionType: section as SectionType } },
        update: { content, status: 'CLINICIAN_REVIEWING', generatedBy: 'RULES' },
        create: { reportId, sectionType: section as SectionType, content, status: 'CLINICIAN_REVIEWING', generatedBy: 'RULES' },
      });

      results[section] = content;
    }

    return results;
  }

  // ── COGNITIVE_EVALUATION (5c) ────────────────────────────────────────────────

  private async generateCognitiveEvaluation(report: ReportWithIncludes): Promise<string> {
    const patientName = report.patient.name;
    const appliedTests = report.selectedTests;
    const paragraphs: string[] = [];
    const domainResults: DomainResult[] = [];

    for (const testResult of report.testResults) {
      const test = testResult.test;
      if (!appliedTests.includes(test.code)) continue;
      if (test.type === 'questionnaire' || test.type === 'social-cognition') continue;

      const slots = test.scoreSlots;
      const scoresObj = testResult.scores as Record<string, number>;

      for (const slot of slots) {
        const rawValue = scoresObj[slot.key];
        if (rawValue === undefined || rawValue === null) continue;

        let standardScore: number;
        let scoreType: string;
        let percentile: number | undefined;

        if (slot.requiresConversion) {
          const norm = await this.normative.convert({ slotId: slot.id, rawScore: rawValue });
          if (!norm) continue;
          standardScore = norm.standardScore;
          scoreType = norm.scoreType;
          percentile = norm.percentile;
        } else {
          standardScore = rawValue;
          scoreType = slot.scoreType;
        }

        const desc = await this.descriptor.describe({
          standardScore,
          scaleCode: slot.descriptorScaleCode,
          isInverse: slot.isInverse,
        });

        await this.prisma.testResult.update({
          where: { id: testResult.id },
          data: {
            standardScore,
            scoreType,
            percentile: percentile ?? null,
            descriptor: desc.label,
          },
        });

        // Only generate paragraph for index-level slots (SS type or primary slot per test)
        if (slot.scoreType === 'SS' || slot.scoreType === 'Z') {
          const testPrefix = test.code.replace('-', '').replace('.', '');
          const descriptorKey = this.labelToKey(desc.label);
          const code = `${testPrefix}.${slot.key}.${descriptorKey}`;

          const text = await this.dictionary.lookup(code, {
            paciente: patientName,
            puntaje: String(Math.round(standardScore * 10) / 10),
            percentil: percentile !== undefined ? String(Math.round(percentile)) : '—',
            descriptor: desc.label,
            testNombre: test.name,
          });

          paragraphs.push(text);
          domainResults.push({ domainName: test.name, lowestLabel: desc.label });
        }
      }
    }

    return paragraphs.join('\n\n');
  }

  // ── QUESTIONNAIRE_SYMPTOMS (5b) ──────────────────────────────────────────────

  private async generateQuestionnaires(report: ReportWithIncludes): Promise<string> {
    const patientName = report.patient.name;
    const appliedTests = report.selectedTests;
    const paragraphs: string[] = [];

    for (const testResult of report.testResults) {
      const test = testResult.test;
      if (!appliedTests.includes(test.code)) continue;
      if (test.type !== 'questionnaire') continue;

      const slots = test.scoreSlots;
      const scoresObj = testResult.scores as Record<string, number>;

      for (const slot of slots) {
        const value = scoresObj[slot.key];
        if (value === undefined || value === null) continue;
        if (!slot.cutoffBorderline && !slot.cutoffClinicallySignificant) continue;

        let level: string;
        if (slot.cutoffClinicallySignificant !== null && value >= slot.cutoffClinicallySignificant!) {
          level = 'clinicamente_significativo';
        } else if (slot.cutoffBorderline !== null && value >= slot.cutoffBorderline!) {
          level = 'limitrofe';
        } else {
          level = 'normal';
        }

        const testKey = test.code.replace('-', '').replace('.', '');
        const code = `${testKey}.${slot.key}.${level}`;

        const text = await this.dictionary.lookup(code, {
          paciente: patientName,
          puntaje: String(value),
          descriptor: level.replace('_', ' '),
          testNombre: test.name,
        });

        paragraphs.push(text);
      }
    }

    return paragraphs.join('\n\n');
  }

  // ── SOCIAL_COGNITION (5d) ────────────────────────────────────────────────────

  private async generateSocialCognition(report: ReportWithIncludes): Promise<string> {
    if (report.frameworkCode !== 'SNP_CHC') return '';

    const patientName = report.patient.name;
    const appliedTests = report.selectedTests;
    const paragraphs: string[] = [];

    for (const testResult of report.testResults) {
      const test = testResult.test;
      if (!appliedTests.includes(test.code)) continue;
      if (test.type !== 'social-cognition') continue;

      const scoresObj = testResult.scores as Record<string, number>;
      const slots = test.scoreSlots;

      for (const slot of slots) {
        const value = scoresObj[slot.key];
        if (value === undefined || value === null) continue;

        let level: string;
        if (test.code === 'ADOS-2') {
          // CSS 1-4 = sin_autism, 5-7 = leve, 8-10 = moderado_severo
          if (value <= 4) level = 'sin_autism';
          else if (value <= 7) level = 'leve';
          else level = 'moderado_severo';
        } else if (test.code === 'ADI-R') {
          // Values above cutoff = en_rango, below = bajo_umbral
          level = value >= 10 ? 'en_rango' : 'bajo_umbral';
        } else {
          continue;
        }

        const testKey = test.code.replace('-', '').replace('.', '');
        const code = `${testKey}.${slot.key}.${level}`;
        const text = await this.dictionary.lookup(code, {
          paciente: patientName,
          puntaje: String(value),
          descriptor: level.replace(/_/g, ' '),
          testNombre: test.name,
        });

        paragraphs.push(text);
      }
    }

    return paragraphs.join('\n\n');
  }

  // ── RESULTS_SYNTHESIS (6) ────────────────────────────────────────────────────

  private async generateSynthesis(report: ReportWithIncludes): Promise<string> {
    const patientName = report.patient.name;
    const frameworkCode = report.frameworkCode === 'SNP_CHC' ? 'SNP_CHC' : 'ESTANDAR';

    // Gather all generated descriptors for this report
    const results = await this.prisma.testResult.findMany({
      where: { reportId: report.id, descriptor: { not: null } },
      include: { test: { select: { name: true, type: true } } },
    });

    const lowResults = results.filter((r) => {
      const d = r.descriptor ?? '';
      return d.includes('bajo') || d.includes('Limítrofe') || d.includes('Muy bajo') || d.includes('Extremadamente');
    });

    const dominios = lowResults.length > 0
      ? lowResults.map((r) => `${r.test.name} (${r.descriptor})`).join(', ')
      : 'rendimiento dentro de parámetros normativos en todas las áreas evaluadas';

    return this.dictionary.lookup(`SINTESIS.${frameworkCode}.base`, {
      paciente: patientName,
      dominios_afectados: dominios,
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private async assertSectionNotApproved(reportId: string, sectionType: string) {
    const section = await this.prisma.reportSection.findUnique({
      where: { reportId_sectionType: { reportId, sectionType: sectionType as SectionType } },
    });
    if (section?.status === 'APPROVED') {
      throw new ForbiddenException(`La sección ${sectionType} ya fue aprobada y no puede sobreescribirse.`);
    }
  }

  private labelToKey(label: string): string {
    return label
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  }
}

// Inline type for report with relations
type ReportWithIncludes = {
  id: string;
  frameworkCode: string;
  selectedTests: string[];
  patient: { name: string };
  testResults: Array<{
    id: string;
    scores: unknown;
    test: {
      code: string;
      name: string;
      type: string;
      scoreSlots: Array<{
        id: string;
        key: string;
        scoreType: string;
        descriptorScaleCode: string;
        requiresConversion: boolean;
        isInverse: boolean;
        cutoffBorderline: number | null;
        cutoffClinicallySignificant: number | null;
        descriptorScale: { code: string; ranges: Array<{ minScore: number; maxScore: number; label: string; labelShort: string; orderIndex: number }> };
      }>;
    };
  }>;
};
