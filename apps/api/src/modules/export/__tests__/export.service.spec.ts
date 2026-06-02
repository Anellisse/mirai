import { NotFoundException } from '@nestjs/common';
import { Role, UserPayload } from '@mirai/shared-types';

jest.mock('../word-builder', () => ({
  buildWordDocument: jest.fn().mockResolvedValue(Buffer.from('fake-docx')),
}));

import { ExportService } from '../export.service';

const USER: UserPayload = { sub: 'u1', organizationId: 'org1', role: Role.CLINICO_SENIOR, email: 'a@b.cl', twoFactorVerified: true };

const MOCK_REPORT = {
  id: 'rep1',
  frameworkCode: 'SNP_CHC',
  selectedTests: ['WISC-V'],
  consultationReason: null,
  patient: { name: 'María González', birthDate: new Date('2010-03-15'), gender: 'F' },
  author: { name: 'Dr. Juan Pérez', title: 'Psicólogo', registrationNumber: '12345' },
  sections: [{ sectionType: 'BACKGROUND', content: 'Antecedentes...' }],
  clinicalConclusion: { content: 'Conclusión...' },
};

const MOCK_TABLES = { wechslerIndices: [], wechslerSubtests: [], battery: [], questionnaires: [] };

function makePrisma(report = MOCK_REPORT) {
  return {
    report: { findUnique: jest.fn().mockResolvedValue(report) },
    organization: { findUnique: jest.fn().mockResolvedValue({ name: 'Neuropsia', subtitle: null }) },
  };
}

const mockReportsService = { checkEditAccess: jest.fn().mockResolvedValue(undefined) };
const mockAnnexTablesService = { getAnnexTables: jest.fn().mockResolvedValue(MOCK_TABLES) };

describe('ExportService', () => {
  it('checks edit access before generating', async () => {
    const service = new ExportService(makePrisma() as any, mockReportsService as any, mockAnnexTablesService as any);
    await service.generateDocx('rep1', USER);
    expect(mockReportsService.checkEditAccess).toHaveBeenCalledWith('rep1', USER);
  });

  it('returns a buffer and filename for valid report', async () => {
    const service = new ExportService(makePrisma() as any, mockReportsService as any, mockAnnexTablesService as any);
    const result = await service.generateDocx('rep1', USER);
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.filename).toMatch(/Informe_.*\.docx/);
    expect(result.filename).toContain('María_González');
  });

  it('throws NotFoundException when report does not exist', async () => {
    const prisma = makePrisma();
    prisma.report.findUnique = jest.fn().mockResolvedValue(null);
    const service = new ExportService(prisma as any, mockReportsService as any, mockAnnexTablesService as any);
    await expect(service.generateDocx('missing', USER)).rejects.toThrow(NotFoundException);
  });

  it('calls buildWordDocument with the assembled data', async () => {
    const { buildWordDocument } = require('../word-builder');
    const service = new ExportService(makePrisma() as any, mockReportsService as any, mockAnnexTablesService as any);
    await service.generateDocx('rep1', USER);
    expect(buildWordDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        patient: expect.objectContaining({ name: 'María González' }),
        sections: expect.arrayContaining([expect.objectContaining({ sectionType: 'BACKGROUND' })]),
      }),
    );
  });
});
