import { Injectable, InternalServerErrorException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
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

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 2048;

@Injectable()
export class AiService {
  private readonly client: Anthropic;

  constructor(
    private readonly prisma: PrismaService,
    private readonly reportsService: ReportsService,
  ) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new InternalServerErrorException(
        'ANTHROPIC_API_KEY no está configurada. Contacte al administrador del sistema.',
      );
    }
    this.client = new Anthropic({ apiKey });
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

    const draft = await this.callClaude(BACKGROUND_SYSTEM_PROMPT, userPrompt);

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

    const draft = await this.callClaude(OBSERVATION_SYSTEM_PROMPT, userPrompt);

    return this.saveDraft(reportId, SectionType.OBSERVED_BEHAVIOR, draft, user.sub);
  }

  private async callClaude(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userPrompt }],
    });

    const block = response.content.find((b) => b.type === 'text');
    if (!block || block.type !== 'text') {
      throw new InternalServerErrorException('La IA no devolvió texto.');
    }
    return block.text.trim();
  }

  private async saveDraft(reportId: string, sectionType: SectionType, draft: string, userId: string) {
    const existing = await this.prisma.reportSection.findFirst({
      where: { reportId, sectionType },
    });

    if (existing && existing.status === SectionStatus.APPROVED) {
      return existing; // Never overwrite an approved section
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
