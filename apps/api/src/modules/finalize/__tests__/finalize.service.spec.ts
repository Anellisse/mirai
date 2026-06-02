import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import { Role, UserPayload } from '@mirai/shared-types';
import { FinalizeService } from '../finalize.service';
import { FinalReportSourceEnum } from '../dto/finalize-report.dto';

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

const fsMock = require('fs');

const USER: UserPayload = { sub: 'u1', organizationId: 'org1', role: Role.CLINICO_SENIOR, email: 'a@b.cl', twoFactorVerified: true };

const baseReport = {
  id: 'rep1', status: 'APPROVED',
  author: { name: 'Dr. Pérez', registrationNumber: '12345' },
  finalReport: null,
};

function makePrisma(report = baseReport, finalReport: object | null = null) {
  return {
    report: {
      findUnique: jest.fn().mockResolvedValue({ ...report, finalReport }),
      update: jest.fn().mockResolvedValue({}),
    },
    finalReport: {
      findUnique: jest.fn().mockResolvedValue(finalReport),
      create: jest.fn().mockResolvedValue({ id: 'fr1', source: 'SYSTEM_PDF', fileHash: 'abc', version: 1 }),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  };
}

const mockReportsService = { checkEditAccess: jest.fn().mockResolvedValue(undefined) };
const mockExportService = { generateDocx: jest.fn().mockResolvedValue({ buffer: Buffer.from('docx'), filename: 'test.docx' }) };

describe('FinalizeService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getFinalReport', () => {
    it('checks access and returns final report', async () => {
      const prisma = makePrisma();
      const service = new FinalizeService(prisma as any, mockReportsService as any, mockExportService as any);
      await service.getFinalReport('rep1', USER);
      expect(mockReportsService.checkEditAccess).toHaveBeenCalledWith('rep1', USER);
      expect(prisma.finalReport.findUnique).toHaveBeenCalledWith({ where: { reportId: 'rep1' } });
    });
  });

  describe('finalize — Option A (SYSTEM_PDF)', () => {
    it('generates docx, saves file, creates FinalReport, transitions to FINAL', async () => {
      const prisma = makePrisma();
      const service = new FinalizeService(prisma as any, mockReportsService as any, mockExportService as any);
      const result = await service.finalize('rep1', FinalReportSourceEnum.SYSTEM_PDF, USER);
      expect(mockExportService.generateDocx).toHaveBeenCalledWith('rep1', USER);
      expect(fsMock.writeFileSync).toHaveBeenCalled();
      expect(prisma.finalReport.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ source: 'SYSTEM_PDF', version: 1 }) }),
      );
      expect(prisma.report.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'FINAL' } }));
      expect(result.source).toBe('SYSTEM_PDF');
    });

    it('transitions from APPROVED through EXPORTED to FINAL', async () => {
      const prisma = makePrisma({ ...baseReport, status: 'APPROVED' });
      const service = new FinalizeService(prisma as any, mockReportsService as any, mockExportService as any);
      await service.finalize('rep1', FinalReportSourceEnum.SYSTEM_PDF, USER);
      const updateCalls = (prisma.report.update as jest.Mock).mock.calls;
      expect(updateCalls.some((c: any[]) => c[0].data.status === 'EXPORTED')).toBe(true);
      expect(updateCalls.some((c: any[]) => c[0].data.status === 'FINAL')).toBe(true);
    });

    it('skips EXPORTED transition when already EXPORTED', async () => {
      const prisma = makePrisma({ ...baseReport, status: 'EXPORTED' });
      const service = new FinalizeService(prisma as any, mockReportsService as any, mockExportService as any);
      await service.finalize('rep1', FinalReportSourceEnum.SYSTEM_PDF, USER);
      const updateCalls = (prisma.report.update as jest.Mock).mock.calls;
      expect(updateCalls.filter((c: any[]) => c[0].data.status === 'EXPORTED')).toHaveLength(0);
      expect(updateCalls.some((c: any[]) => c[0].data.status === 'FINAL')).toBe(true);
    });
  });

  describe('finalize — Option B (UPLOADED)', () => {
    const pdfFile = { mimetype: 'application/pdf', buffer: Buffer.from('%PDF-1.4') } as Express.Multer.File;

    it('saves uploaded PDF and creates FinalReport', async () => {
      const prisma = makePrisma();
      const service = new FinalizeService(prisma as any, mockReportsService as any, mockExportService as any);
      await service.finalize('rep1', FinalReportSourceEnum.UPLOADED, USER, pdfFile);
      expect(mockExportService.generateDocx).not.toHaveBeenCalled();
      expect(fsMock.writeFileSync).toHaveBeenCalled();
      expect(prisma.finalReport.create).toHaveBeenCalled();
    });

    it('rejects non-PDF uploads', async () => {
      const prisma = makePrisma();
      const service = new FinalizeService(prisma as any, mockReportsService as any, mockExportService as any);
      const badFile = { mimetype: 'image/jpeg', buffer: Buffer.from('fake') } as Express.Multer.File;
      await expect(service.finalize('rep1', FinalReportSourceEnum.UPLOADED, USER, badFile)).rejects.toThrow(BadRequestException);
    });

    it('rejects UPLOADED without file', async () => {
      const prisma = makePrisma();
      const service = new FinalizeService(prisma as any, mockReportsService as any, mockExportService as any);
      await expect(service.finalize('rep1', FinalReportSourceEnum.UPLOADED, USER)).rejects.toThrow(BadRequestException);
    });
  });

  describe('error cases', () => {
    it('throws NotFoundException when report does not exist', async () => {
      const prisma = makePrisma();
      prisma.report.findUnique = jest.fn().mockResolvedValue(null);
      const service = new FinalizeService(prisma as any, mockReportsService as any, mockExportService as any);
      await expect(service.finalize('missing', FinalReportSourceEnum.SYSTEM_PDF, USER)).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException for invalid report status', async () => {
      const prisma = makePrisma({ ...baseReport, status: 'DRAFT' });
      const service = new FinalizeService(prisma as any, mockReportsService as any, mockExportService as any);
      await expect(service.finalize('rep1', FinalReportSourceEnum.SYSTEM_PDF, USER)).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when FinalReport already exists', async () => {
      const prisma = makePrisma(baseReport, { id: 'fr1' });
      const service = new FinalizeService(prisma as any, mockReportsService as any, mockExportService as any);
      await expect(service.finalize('rep1', FinalReportSourceEnum.SYSTEM_PDF, USER)).rejects.toThrow(ConflictException);
    });
  });
});
