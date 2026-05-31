import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ReportsService } from '../reports/reports.service';
import { UserPayload } from '@mirai/shared-types';
import { UpsertConclusionDto } from './dto/upsert-conclusion.dto';

const DEFAULT_CLOSING =
  'Los resultados de esta evaluación se entregan con carácter estrictamente confidencial y deben ser interpretados en el contexto clínico integral del paciente.';

@Injectable()
export class ConclusionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportsService: ReportsService,
  ) {}

  async getConclusion(reportId: string, user: UserPayload) {
    await this.reportsService.checkEditAccess(reportId, user);

    const existing = await this.prisma.clinicalConclusion.findUnique({
      where: { reportId },
      include: { hypotheses: { orderBy: { orderIndex: 'asc' } } },
    });

    if (existing) {
      const closingNote = existing.closingNote ?? (await this.getOrgClosingTemplate(reportId));
      return { ...existing, closingNote };
    }

    const processNarrative = await this.buildProcessNarrative(reportId);
    const closingNote = await this.getOrgClosingTemplate(reportId);
    return {
      reportId,
      processNarrative,
      closingNote,
      hypotheses: [],
      content: '',
      includeEmotionalNote: false,
    };
  }

  async upsertConclusion(reportId: string, dto: UpsertConclusionDto, user: UserPayload) {
    await this.reportsService.checkEditAccess(reportId, user);

    const content = this.assembleContent(dto);

    const conclusion = await this.prisma.clinicalConclusion.upsert({
      where: { reportId },
      update: {
        content,
        processNarrative: dto.processNarrative,
        cognitiveImpact: dto.cognitiveImpact,
        emotionalNote: dto.emotionalNote,
        includeEmotionalNote: dto.includeEmotionalNote,
        closingNote: dto.closingNote,
      },
      create: {
        reportId,
        content,
        processNarrative: dto.processNarrative,
        cognitiveImpact: dto.cognitiveImpact,
        emotionalNote: dto.emotionalNote,
        includeEmotionalNote: dto.includeEmotionalNote ?? false,
        closingNote: dto.closingNote,
      },
    });

    if (dto.hypotheses !== undefined) {
      await this.prisma.diagnosticHypothesis.deleteMany({ where: { conclusionId: conclusion.id } });
      if (dto.hypotheses.length > 0) {
        await this.prisma.diagnosticHypothesis.createMany({
          data: dto.hypotheses.map((h) => ({
            conclusionId: conclusion.id,
            dxCode: h.dxCode,
            dxName: h.dxName,
            specifiers: h.specifiers,
            justification: h.justification,
            status: h.status,
            orderIndex: h.orderIndex,
          })),
        });
      }
    }

    return this.prisma.clinicalConclusion.findUnique({
      where: { reportId },
      include: { hypotheses: { orderBy: { orderIndex: 'asc' } } },
    });
  }

  private assembleContent(dto: UpsertConclusionDto): string {
    const blocks: string[] = [];
    if (dto.processNarrative) blocks.push(dto.processNarrative);
    if (dto.cognitiveImpact) blocks.push(dto.cognitiveImpact);
    if (dto.includeEmotionalNote && dto.emotionalNote) blocks.push(dto.emotionalNote);
    if (dto.closingNote) blocks.push(dto.closingNote);
    return blocks.join('\n\n');
  }

  private async buildProcessNarrative(reportId: string): Promise<string> {
    const obs = await this.prisma.observationChecklist.findUnique({ where: { reportId } });
    if (!obs) return '';
    const d = obs.data as Record<string, any>;

    const cooperacion =
      d.cooperacion === 0 ? 'adecuada' : d.cooperacion === 1 ? 'variable' : 'escasa';
    const motivacion =
      d.motivacion === 0 ? 'adecuada' : d.motivacion === 1 ? 'variable' : 'reducida';
    const nivelAct =
      d.nivelActividad === 'hipo'
        ? 'hipoactivo'
        : d.nivelActividad === 'hiper'
          ? 'hiperactivo'
          : 'normativo';
    const atencion =
      d.atencionSostenida === 0
        ? 'adecuada'
        : d.atencionSostenida === 1
          ? 'levemente reducida'
          : 'significativamente reducida';
    const ansiedad = d.ansiedad === 0 ? 'bajo' : d.ansiedad === 1 ? 'moderado' : 'elevado';

    return `Durante el proceso de evaluación, el/la paciente mostró una cooperación ${cooperacion} y motivación ${motivacion}. Se observó un nivel de actividad motora ${nivelAct}, con una atención sostenida ${atencion} y un nivel de ansiedad ${ansiedad}. ${d.additionalObservations ?? ''}`.trim();
  }

  private async getOrgClosingTemplate(reportId: string): Promise<string> {
    const report = await this.prisma.report.findFirst({
      where: { id: reportId },
      select: { organizationId: true },
    });
    if (!report) return DEFAULT_CLOSING;
    const org = await this.prisma.organization.findUnique({
      where: { id: report.organizationId },
      select: { closingNoteTemplate: true },
    });
    return org?.closingNoteTemplate ?? DEFAULT_CLOSING;
  }
}
