import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GeneratedBy, Prisma, SectionStatus, SectionType } from '@prisma/client';
import { UserPayload } from '@mirai/shared-types';
import { PrismaService } from '../../prisma.service';
import { ReportsService } from '../reports/reports.service';
import { UpsertProcedureDto } from './dto/upsert-procedure.dto';
import { generateProcedureText, ProcedureSourceData } from './procedure-text';

@Injectable()
export class ProcedureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportsService: ReportsService,
  ) {}

  async getProcedure(reportId: string, user: UserPayload) {
    await this.reportsService.checkEditAccess(reportId, user);

    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      select: {
        selectedTests: true,
        frameworkCode: true,
        patient: { select: { name: true } },
      },
    });

    if (!report) throw new NotFoundException('Informe no encontrado');

    const section = await this.prisma.reportSection.findFirst({
      where: { reportId, sectionType: SectionType.PROCEDURE_TESTS },
      select: { content: true, status: true, sourceData: true },
    });

    return {
      selectedTests: (report.selectedTests ?? []) as string[],
      frameworkCode: report.frameworkCode,
      procedureData: section?.sourceData ?? null,
      content: section?.content ?? null,
      sectionStatus: section?.status ?? SectionStatus.PENDING,
    };
  }

  async upsertProcedure(reportId: string, dto: UpsertProcedureDto, user: UserPayload) {
    await this.reportsService.checkEditAccess(reportId, user);

    if (dto.questionnairesShared) {
      const qTests = await this.prisma.cognitiveTest.findMany({
        where: { code: { in: dto.selectedTests }, type: 'questionnaire' },
        select: { id: true },
      });
      if (qTests.length === 0) {
        throw new BadRequestException(
          'Debe seleccionar al menos un cuestionario para activar esta opción',
        );
      }
    }

    await this.prisma.report.update({
      where: { id: reportId },
      data: { selectedTests: dto.selectedTests },
    });

    const [tests, report] = await Promise.all([
      this.prisma.cognitiveTest.findMany({
        where: { code: { in: dto.selectedTests } },
        select: { code: true, name: true, type: true, orderIndex: true },
        orderBy: { orderIndex: 'asc' },
      }),
      this.prisma.report.findUnique({
        where: { id: reportId },
        select: { patient: { select: { name: true } } },
      }),
    ]);

    const procedureData: ProcedureSourceData = {
      interviewWith: dto.interviewWith,
      interviewModality: dto.interviewModality,
      adirModality: dto.adirModality,
      questionnairesShared: dto.questionnairesShared,
      questionnaireRespondent: dto.questionnaireRespondent ?? null,
      questionnaireRespondentCustom: dto.questionnaireRespondentCustom ?? null,
    };

    const content = generateProcedureText(
      procedureData,
      report?.patient?.name ?? 'el/la paciente',
      tests,
    );

    const section = await this.prisma.reportSection.findFirst({
      where: { reportId, sectionType: SectionType.PROCEDURE_TESTS },
    });

    if (!section) throw new NotFoundException('Sección no encontrada');

    const updated = await this.prisma.reportSection.update({
      where: { id: section.id },
      data: {
        content,
        sourceData: procedureData as unknown as Prisma.InputJsonValue,
        generatedBy: GeneratedBy.RULES,
        status: SectionStatus.CLINICIAN_REVIEWING,
        clinicianEdited: false,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.sub,
        action: 'SECTION_SAVED',
        resource: 'ReportSection',
        resourceId: section.id,
        metadata: { sectionType: 'PROCEDURE_TESTS', reportId } as Prisma.InputJsonValue,
      },
    });

    return {
      content: updated.content,
      status: updated.status,
      sourceData: updated.sourceData,
    };
  }
}
