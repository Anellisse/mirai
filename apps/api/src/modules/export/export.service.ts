import { Injectable, NotFoundException } from '@nestjs/common';
import { UserPayload } from '@mirai/shared-types';
import { PrismaService } from '../../prisma.service';
import { ReportsService } from '../reports/reports.service';
import { AnnexTablesService } from '../annex-tables/annex-tables.service';
import { buildWordDocument, ReportForExport } from './word-builder';

@Injectable()
export class ExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportsService: ReportsService,
    private readonly annexTables: AnnexTablesService,
  ) {}

  async generateDocx(reportId: string, user: UserPayload): Promise<{ buffer: Buffer; filename: string }> {
    await this.reportsService.checkEditAccess(reportId, user);

    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: {
        patient: { select: { name: true, birthDate: true, gender: true } },
        author: { select: { name: true, title: true, registrationNumber: true } },
        sections: { select: { sectionType: true, content: true }, orderBy: { orderIndex: 'asc' } },
        clinicalConclusion: { select: { content: true } },
      },
    });

    if (!report) throw new NotFoundException('Informe no encontrado');

    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { name: true, subtitle: true },
    });

    const tables = await this.annexTables.getAnnexTables(reportId, user);

    const data: ReportForExport = {
      id: report.id,
      frameworkCode: report.frameworkCode,
      selectedTests: report.selectedTests,
      consultationReason: report.consultationReason,
      patient: report.patient,
      author: report.author,
      organization: org ?? { name: 'Neuropsia', subtitle: null },
      sections: report.sections,
      clinicalConclusion: report.clinicalConclusion,
      annexTables: tables,
    };

    const buffer = await buildWordDocument(data);
    const safeName = report.patient.name.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]/g, '').trim().replace(/\s+/g, '_');
    const filename = `Informe_${safeName}_${new Date().toISOString().slice(0, 10)}.docx`;

    return { buffer, filename };
  }
}
