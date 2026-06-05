import { Injectable, InternalServerErrorException } from '@nestjs/common';
import OpenAI from 'openai';
import { SectionStatus, SectionType } from '@prisma/client';
import { UserPayload } from '@mirai/shared-types';
import { PrismaService } from '../../prisma.service';
import { ReportsService } from '../reports/reports.service';
import {
  BACKGROUND_SYSTEM_PROMPT,
  OBSERVATION_SYSTEM_PROMPT,
  formatInterviewForPrompt,
  formatObservationForPrompt,
} from './ai-prompts';

const MODEL = 'deepseek-chat';
const MAX_TOKENS = 2048;

@Injectable()
export class AiService {
  private readonly client: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly reportsService: ReportsService,
  ) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new InternalServerErrorException(
        'DEEPSEEK_API_KEY no está configurada. Contacte al administrador del sistema.',
      );
    }
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.deepseek.com',
    });
  }

  async generateBackground(reportId: string, user: UserPayload) {
    await this.reportsService.checkEditAccess(reportId, user);

    const [report, interviewForm] = await Promise.all([
      this.prisma.report.findUnique({
        where: { id: reportId },
        select: { patient: { select: { name: true } } },
      }),
      this.prisma.interviewForm.findUnique({ where: { reportId } }),
    ]);

    const patientName = report?.patient.name ?? 'el/la paciente';
    const formData = (interviewForm?.data ?? {}) as Record<string, unknown>;
    const userPrompt = formatInterviewForPrompt(formData, patientName);

    const draft = await this.callAI(BACKGROUND_SYSTEM_PROMPT, userPrompt);

    return this.saveDraft(reportId, SectionType.BACKGROUND, draft, user.sub);
  }

  async generateObservation(reportId: string, user: UserPayload) {
    await this.reportsService.checkEditAccess(reportId, user);

    const [report, checklist] = await Promise.all([
      this.prisma.report.findUnique({
        where: { id: reportId },
        select: { patient: { select: { name: true } } },
      }),
      this.prisma.observationChecklist.findUnique({ where: { reportId } }),
    ]);

    const patientName = report?.patient.name ?? 'el/la paciente';
    const checklistData = (checklist?.data ?? {}) as Record<string, unknown>;
    const userPrompt = formatObservationForPrompt(checklistData, patientName);

    const draft = await this.callAI(OBSERVATION_SYSTEM_PROMPT, userPrompt);

    return this.saveDraft(reportId, SectionType.OBSERVED_BEHAVIOR, draft, user.sub);
  }

  private async callAI(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new InternalServerErrorException('La IA no devolvió texto.');
    }
    return content.trim();
  }

  private async saveDraft(reportId: string, sectionType: SectionType, draft: string, userId: string) {
    const existing = await this.prisma.reportSection.findFirst({
      where: { reportId, sectionType },
    });

    if (existing && existing.status === SectionStatus.APPROVED) {
      return existing;
    }

    const data = {
      content: draft,
      aiRawOutput: draft,
      status: SectionStatus.AI_GENERATED,
      generatedBy: 'AI' as const,
      clinicianEdited: false,
    };

    const section = existing
      ? await this.prisma.reportSection.update({ where: { id: existing.id }, data })
      : await this.prisma.reportSection.create({
          data: { reportId, sectionType, ...data, orderIndex: 0 },
        });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'AI_DRAFT_GENERATED',
        resource: 'ReportSection',
        resourceId: section.id,
        metadata: { sectionType, reportId },
      },
    });

    return section;
  }
}
