import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { UserPayload } from '@mirai/shared-types';
import { PrismaService } from '../../prisma.service';
import { ReportsService } from '../reports/reports.service';

const MAX_SIZE_BYTES = 20 * 1024 * 1024;

function storageBase(): string {
  const envPath = process.env.STORAGE_BASE_PATH;
  if (envPath) return path.resolve(envPath);
  return path.resolve(process.cwd(), '..', '..', 'storage');
}

@Injectable()
export class ScorePdfsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportsService: ReportsService,
  ) {}

  async list(reportId: string, user: UserPayload) {
    await this.reportsService.checkEditAccess(reportId, user);
    return this.prisma.importedScoreReport.findMany({
      where: { reportId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async upload(
    reportId: string,
    file: Express.Multer.File,
    user: UserPayload,
  ) {
    await this.reportsService.checkEditAccess(reportId, user);

    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Solo se aceptan archivos PDF.');
    }

    if (file.size > MAX_SIZE_BYTES) {
      throw new BadRequestException('El archivo supera el límite de 20 MB.');
    }

    const hash = createHash('sha256').update(file.buffer).digest('hex');
    const dir = path.join(storageBase(), 'imported-pdfs', reportId);
    fs.mkdirSync(dir, { recursive: true });

    const fileName = `${hash}.pdf`;
    const filePath = path.join(dir, fileName);
    fs.writeFileSync(filePath, file.buffer);

    return this.prisma.importedScoreReport.create({
      data: {
        reportId,
        source: 'MANUAL',
        pdfHash: hash,
        pdfPath: filePath,
        rawExtractedData: { originalName: file.originalname },
      },
    });
  }

  async remove(reportId: string, pdfId: string, user: UserPayload) {
    await this.reportsService.checkEditAccess(reportId, user);

    const record = await this.prisma.importedScoreReport.findFirst({
      where: { id: pdfId, reportId },
    });

    if (!record) throw new NotFoundException('PDF no encontrado.');

    try {
      fs.unlinkSync(record.pdfPath);
    } catch {
      // File may have already been deleted — continue
    }

    await this.prisma.importedScoreReport.delete({ where: { id: pdfId } });
    return { deleted: true };
  }
}
