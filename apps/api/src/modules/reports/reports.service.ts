import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ReportStateMachineService, TransitionAction } from './report-state-machine.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { UserPayload } from '@mirai/shared-types';
import { ReportStatus, SectionStatus, SectionType } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stateMachine: ReportStateMachineService,
  ) {}

  async create(dto: CreateReportDto, user: UserPayload) {
    const report = await this.prisma.report.create({
      data: {
        patientId: dto.patientId,
        authorId: user.sub,
        supervisorId: dto.supervisorId,
        organizationId: user.organizationId,
        status: ReportStatus.DRAFT,
        frameworkCode: dto.frameworkCode,
        selectedTests: dto.selectedTests,
      },
    });

    await this.prisma.reportSection.createMany({
      data: Object.values(SectionType).map((sectionType, i) => ({
        reportId: report.id,
        sectionType,
        status: SectionStatus.PENDING,
        orderIndex: i,
      })),
    });

    await this.prisma.auditLog.create({
      data: { userId: user.sub, action: 'REPORT_CREATED', resource: 'Report', resourceId: report.id },
    });

    return report;
  }

  async findAll(user: UserPayload) {
    return this.prisma.report.findMany({
      where: {
        deletedAt: null,
        OR: [
          { authorId: user.sub },
          { supervisorId: user.sub },
          { accessGrants: { some: { userId: user.sub, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        status: true,
        frameworkCode: true,
        createdAt: true,
        updatedAt: true,
        patient: { select: { id: true, name: true } },
        author: { select: { id: true, name: true } },
      },
    });
  }

  async findOne(reportId: string, user: UserPayload) {
    const report = await this.prisma.report.findFirst({
      where: { id: reportId, deletedAt: null },
      include: {
        sections: { orderBy: { orderIndex: 'asc' } },
        patient: { select: { id: true, name: true } },
        author: { select: { id: true, name: true } },
      },
    });

    if (!report) throw new NotFoundException('Informe no encontrado');

    const canAccess =
      report.authorId === user.sub ||
      report.supervisorId === user.sub ||
      (await this.prisma.accessGrant.findFirst({
        where: {
          userId: user.sub,
          reportId,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      }));

    if (!canAccess) throw new ForbiddenException('Sin acceso al informe');
    return report;
  }

  async update(reportId: string, dto: UpdateReportDto, user: UserPayload) {
    const report = await this.prisma.report.findFirst({
      where: { id: reportId, deletedAt: null, authorId: user.sub },
    });
    if (!report) throw new NotFoundException('Informe no encontrado o sin permiso');

    const editableStatuses: ReportStatus[] = [ReportStatus.DRAFT, ReportStatus.IN_PROGRESS];
    if (!editableStatuses.includes(report.status))
      throw new ForbiddenException('El informe no está en estado editable');

    return this.prisma.report.update({ where: { id: reportId }, data: dto });
  }

  async saveSection(reportId: string, sectionType: string, content: string, user: UserPayload) {
    const report = await this.prisma.report.findFirst({
      where: { id: reportId, deletedAt: null },
    });
    if (!report) throw new NotFoundException('Informe no encontrado');

    const canEdit = report.authorId === user.sub || report.supervisorId === user.sub;
    if (!canEdit) throw new ForbiddenException('Sin permiso para editar secciones');

    const section = await this.prisma.reportSection.findFirst({
      where: { reportId, sectionType: sectionType as SectionType },
    });
    if (!section) throw new NotFoundException('Sección no encontrada');

    const newStatus =
      section.status === SectionStatus.PENDING ? SectionStatus.CLINICIAN_REVIEWING : section.status;

    return this.prisma.reportSection.update({
      where: { id: section.id },
      data: { content, status: newStatus, clinicianEdited: true },
    });
  }

  async approveSection(reportId: string, sectionType: string, user: UserPayload) {
    const report = await this.prisma.report.findFirst({
      where: { id: reportId, deletedAt: null },
    });
    if (!report) throw new NotFoundException('Informe no encontrado');

    const canApprove = report.authorId === user.sub || report.supervisorId === user.sub;
    if (!canApprove) throw new ForbiddenException('Sin permiso para aprobar secciones');

    return this.prisma.reportSection.update({
      where: { reportId_sectionType: { reportId, sectionType: sectionType as SectionType } },
      data: { status: SectionStatus.APPROVED, approvedBy: user.sub, approvedAt: new Date() },
    });
  }

  async executeTransition(reportId: string, action: string, user: UserPayload) {
    const report = await this.prisma.report.findFirst({
      where: { id: reportId, deletedAt: null },
      include: { sections: true, finalReport: { select: { id: true } } },
    });
    if (!report) throw new NotFoundException('Informe no encontrado');

    const nextStatus = this.stateMachine.transition(report, action as TransitionAction, user);

    const updated = await this.prisma.report.update({
      where: { id: reportId },
      data: { status: nextStatus },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.sub,
        action: `REPORT_TRANSITION_${action.toUpperCase()}`,
        resource: 'Report',
        resourceId: reportId,
        metadata: { from: report.status, to: nextStatus },
      },
    });

    return updated;
  }
}
