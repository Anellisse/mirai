import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { FinalReportSource, ReportStatus } from '@prisma/client';
import { UserPayload } from '@mirai/shared-types';
import { PrismaService } from '../../prisma.service';
import { ReportsService } from '../reports/reports.service';
import { ExportService } from '../export/export.service';
import { FinalReportSourceEnum } from './dto/finalize-report.dto';

const ALLOWED_STATUSES: ReportStatus[] = [ReportStatus.APPROVED, ReportStatus.EXPORTED];

function storageBase(): string {
  return path.resolve(process.env.STORAGE_BASE_PATH ?? path.join(process.cwd(), '..', '..', 'storage'));
}

@Injectable()
export class FinalizeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportsService: ReportsService,
    private readonly exportService: ExportService,
  ) {}

  async getFinalReport(reportId: string, user: UserPayload) {
    await this.reportsService.checkEditAccess(reportId, user);
    return this.prisma.finalReport.findUnique({ where: { reportId } });
  }

  async finalize(
    reportId: string,
    source: FinalReportSourceEnum,
    user: UserPayload,
    uploadedFile?: Express.Multer.File,
  ) {
    await this.reportsService.checkEditAccess(reportId, user);

    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: { finalReport: true, author: { select: { name: true, registrationNumber: true } } },
    });
    if (!report) throw new NotFoundException('Informe no encontrado');
    if (!ALLOWED_STATUSES.includes(report.status)) {
      throw new ConflictException(
        `El informe debe estar en estado APPROVED o EXPORTED para finalizar. Estado actual: ${report.status}`,
      );
    }
    if (report.finalReport) {
      throw new ConflictException('El informe ya tiene una versión final. Cree una nueva versión en su lugar.');
    }

    if (source === FinalReportSourceEnum.UPLOADED && !uploadedFile) {
      throw new BadRequestException('Se requiere adjuntar el PDF para la opción UPLOADED.');
    }

    // Store file and compute hash
    const dir = path.join(storageBase(), 'final-reports', reportId, 'v1');
    fs.mkdirSync(dir, { recursive: true });

    let buffer: Buffer;
    let ext: string;

    if (source === FinalReportSourceEnum.SYSTEM_PDF) {
      const { buffer: docxBuffer } = await this.exportService.generateDocx(reportId, user);
      buffer = docxBuffer;
      ext = 'docx';
    } else {
      if (uploadedFile!.mimetype !== 'application/pdf') {
        throw new BadRequestException('Solo se aceptan archivos PDF.');
      }
      buffer = uploadedFile!.buffer;
      ext = 'pdf';
    }

    const hash = createHash('sha256').update(buffer).digest('hex');
    const filePath = path.join(dir, `informe_final.${ext}`);
    fs.writeFileSync(filePath, buffer);

    const signature = `${report.author.name}${report.author.registrationNumber ? ` — Reg. ${report.author.registrationNumber}` : ''} — ${new Date().toLocaleDateString('es-CL')}`;

    const finalReport = await this.prisma.finalReport.create({
      data: {
        reportId,
        source: source as unknown as FinalReportSource,
        fileHash: hash,
        filePath,
        finalizedById: user.sub,
        signature,
        version: 1,
      },
    });

    // Transition report: APPROVED → EXPORTED → FINAL (as needed)
    if (report.status === ReportStatus.APPROVED) {
      await this.prisma.report.update({
        where: { id: reportId },
        data: { status: ReportStatus.EXPORTED },
      });
    }
    await this.prisma.report.update({
      where: { id: reportId },
      data: { status: ReportStatus.FINAL },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.sub,
        action: 'REPORT_FINALIZED',
        resource: 'FinalReport',
        resourceId: finalReport.id,
        metadata: { source, reportId, hash },
      },
    });

    return finalReport;
  }
}
