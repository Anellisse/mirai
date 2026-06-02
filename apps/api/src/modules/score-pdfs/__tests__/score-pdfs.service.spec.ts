import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Role, UserPayload } from '@mirai/shared-types';
import { ScorePdfsService } from '../score-pdfs.service';

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

const USER: UserPayload = { sub: 'user1', organizationId: 'org1', role: Role.CLINICO_SENIOR, email: 'a@b.com', twoFactorVerified: true };

const PDF_RECORD = {
  id: 'pdf1', reportId: 'rep1', source: 'MANUAL', pdfHash: 'abc123', pdfPath: '/storage/imported-pdfs/rep1/abc123.pdf', createdAt: new Date(),
};

function makeFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname: 'file', originalname: 'test.pdf', encoding: '7bit',
    mimetype: 'application/pdf', size: 1024,
    buffer: Buffer.from('%PDF-1.4 fake content'),
    stream: null as any, destination: '', filename: '', path: '',
    ...overrides,
  };
}

function makePrisma(record: object | null = PDF_RECORD) {
  return {
    importedScoreReport: {
      findMany: jest.fn().mockResolvedValue([PDF_RECORD]),
      findFirst: jest.fn().mockResolvedValue(record),
      create: jest.fn().mockResolvedValue(PDF_RECORD),
      delete: jest.fn().mockResolvedValue(PDF_RECORD),
    },
  };
}

const mockReportsService = { checkEditAccess: jest.fn().mockResolvedValue(undefined) };

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fsMock = require('fs');

describe('ScorePdfsService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('returns PDFs for the report ordered by createdAt desc', async () => {
      const prisma = makePrisma();
      const service = new ScorePdfsService(prisma as any, mockReportsService as any);
      const result = await service.list('rep1', USER);
      expect(prisma.importedScoreReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { reportId: 'rep1' }, orderBy: { createdAt: 'desc' } }),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('upload', () => {
    it('rejects non-PDF files', async () => {
      const prisma = makePrisma();
      const service = new ScorePdfsService(prisma as any, mockReportsService as any);
      await expect(service.upload('rep1', makeFile({ mimetype: 'image/jpeg' }), USER)).rejects.toThrow(BadRequestException);
    });

    it('rejects files larger than 20 MB', async () => {
      const prisma = makePrisma();
      const service = new ScorePdfsService(prisma as any, mockReportsService as any);
      const file = makeFile({ size: 21 * 1024 * 1024, buffer: Buffer.alloc(21 * 1024 * 1024) });
      await expect(service.upload('rep1', file, USER)).rejects.toThrow(BadRequestException);
    });

    it('saves file and creates ImportedScoreReport record', async () => {
      const prisma = makePrisma();
      const service = new ScorePdfsService(prisma as any, mockReportsService as any);
      await service.upload('rep1', makeFile(), USER);
      expect(fsMock.mkdirSync).toHaveBeenCalled();
      expect(fsMock.writeFileSync).toHaveBeenCalled();
      expect(prisma.importedScoreReport.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ reportId: 'rep1', source: 'MANUAL' }) }),
      );
    });

    it('computes SHA-256 hash from file buffer', async () => {
      const { createHash } = require('crypto');
      const prisma = makePrisma();
      const service = new ScorePdfsService(prisma as any, mockReportsService as any);
      const file = makeFile();
      await service.upload('rep1', file, USER);
      const expectedHash = createHash('sha256').update(file.buffer).digest('hex');
      expect(prisma.importedScoreReport.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ pdfHash: expectedHash }) }),
      );
    });
  });

  describe('remove', () => {
    it('deletes file and record', async () => {
      const prisma = makePrisma(PDF_RECORD);
      const service = new ScorePdfsService(prisma as any, mockReportsService as any);
      const result = await service.remove('rep1', 'pdf1', USER);
      expect(fsMock.unlinkSync).toHaveBeenCalledWith(PDF_RECORD.pdfPath);
      expect(prisma.importedScoreReport.delete).toHaveBeenCalledWith({ where: { id: 'pdf1' } });
      expect(result).toEqual({ deleted: true });
    });

    it('throws NotFoundException when PDF not found', async () => {
      const prisma = makePrisma(null);
      const service = new ScorePdfsService(prisma as any, mockReportsService as any);
      await expect(service.remove('rep1', 'missing', USER)).rejects.toThrow(NotFoundException);
    });

    it('continues gracefully if file already deleted from disk', async () => {
      (fsMock.unlinkSync as jest.Mock).mockImplementationOnce(() => { throw new Error('ENOENT'); });
      const prisma = makePrisma(PDF_RECORD);
      const service = new ScorePdfsService(prisma as any, mockReportsService as any);
      await expect(service.remove('rep1', 'pdf1', USER)).resolves.toEqual({ deleted: true });
    });
  });
});
