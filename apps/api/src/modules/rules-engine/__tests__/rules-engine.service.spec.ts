import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RulesEngineService } from '../rules-engine.service';
import { SectionTypeEnum } from '../dto/generate-sections.dto';

const USER = { sub: 'user1', organizationId: 'org1' };

const makeReport = (overrides = {}) => ({
  id: 'report1',
  frameworkCode: 'SNP_CHC',
  selectedTests: ['WISC-V'],
  organizationId: 'org1',
  patient: { name: 'Juan' },
  testResults: [
    {
      id: 'tr1',
      scores: { ICV: 100, IVE: 85 },
      test: {
        code: 'WISC-V',
        name: 'WISC-V',
        type: 'intelligence',
        scoreSlots: [
          { id: 'slot_icv', key: 'ICV', scoreType: 'SS', descriptorScaleCode: 'WISC_SS', requiresConversion: false, isInverse: false, cutoffBorderline: null, cutoffClinicallySignificant: null, descriptorScale: { code: 'WISC_SS', ranges: [] } },
          { id: 'slot_ive', key: 'IVE', scoreType: 'SS', descriptorScaleCode: 'WISC_SS', requiresConversion: false, isInverse: false, cutoffBorderline: null, cutoffClinicallySignificant: null, descriptorScale: { code: 'WISC_SS', ranges: [] } },
        ],
      },
    },
  ],
  ...overrides,
});

function makePrisma(report = makeReport(), sectionStatus: string | null = null) {
  return {
    report: { findUnique: jest.fn().mockResolvedValue(report) },
    reportSection: {
      findUnique: jest.fn().mockResolvedValue(sectionStatus ? { status: sectionStatus } : null),
      upsert: jest.fn().mockResolvedValue({}),
    },
    testResult: {
      update: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([
        { id: 'tr1', descriptor: 'Medio bajo', test: { name: 'WISC-V', type: 'intelligence' } },
      ]),
    },
  };
}

function makeNormative(result: { standardScore: number; scoreType: string; percentile?: number } | null = { standardScore: 100, scoreType: 'SS' }) {
  return { convert: jest.fn().mockResolvedValue(result) };
}

function makeDescriptor(label = 'Medio', labelShort = 'M') {
  return { describe: jest.fn().mockResolvedValue({ label, labelShort }) };
}

function makeDictionary(text = 'El ICV de Juan es Medio.') {
  return { lookup: jest.fn().mockResolvedValue(text) };
}

describe('RulesEngineService', () => {
  describe('generateSections', () => {
    it('throws NotFoundException when report does not exist', async () => {
      const prisma = makePrisma();
      prisma.report.findUnique = jest.fn().mockResolvedValue(null);
      const service = new RulesEngineService(prisma as any, makeNormative() as any, makeDescriptor() as any, makeDictionary() as any);
      await expect(service.generateSections('missing', [SectionTypeEnum.COGNITIVE_EVALUATION], USER))
        .rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when org does not match', async () => {
      const report = makeReport({ organizationId: 'other-org' });
      const prisma = makePrisma(report);
      const service = new RulesEngineService(prisma as any, makeNormative() as any, makeDescriptor() as any, makeDictionary() as any);
      await expect(service.generateSections('report1', [SectionTypeEnum.COGNITIVE_EVALUATION], USER))
        .rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when section is already APPROVED', async () => {
      const prisma = makePrisma(makeReport(), 'APPROVED');
      const service = new RulesEngineService(prisma as any, makeNormative() as any, makeDescriptor() as any, makeDictionary() as any);
      await expect(service.generateSections('report1', [SectionTypeEnum.COGNITIVE_EVALUATION], USER))
        .rejects.toThrow(ForbiddenException);
    });

    it('generates COGNITIVE_EVALUATION and upserts section', async () => {
      const prisma = makePrisma();
      const service = new RulesEngineService(prisma as any, makeNormative() as any, makeDescriptor() as any, makeDictionary() as any);
      await service.generateSections('report1', [SectionTypeEnum.COGNITIVE_EVALUATION], USER);
      expect(prisma.reportSection.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { reportId_sectionType: { reportId: 'report1', sectionType: 'COGNITIVE_EVALUATION' } },
          update: expect.objectContaining({ status: 'CLINICIAN_REVIEWING', generatedBy: 'RULES' }),
        }),
      );
    });

    it('skips slot when score not present in testResult.scores', async () => {
      const report = makeReport({
        testResults: [{
          id: 'tr1',
          scores: {},
          test: {
            code: 'WISC-V', name: 'WISC-V', type: 'intelligence',
            scoreSlots: [{ id: 'slot_icv', key: 'ICV', scoreType: 'SS', descriptorScaleCode: 'WISC_SS', requiresConversion: false, isInverse: false, cutoffBorderline: null, cutoffClinicallySignificant: null, descriptorScale: { code: 'WISC_SS', ranges: [] } }],
          },
        }],
      });
      const prisma = makePrisma(report);
      const descriptor = makeDescriptor();
      const service = new RulesEngineService(prisma as any, makeNormative() as any, descriptor as any, makeDictionary() as any);
      await service.generateSections('report1', [SectionTypeEnum.COGNITIVE_EVALUATION], USER);
      expect(descriptor.describe).not.toHaveBeenCalled();
    });

    it('generates RESULTS_SYNTHESIS with affected domains summary', async () => {
      const prisma = makePrisma();
      const dictionary = makeDictionary('En síntesis, Juan muestra compromiso en WISC-V.');
      const service = new RulesEngineService(prisma as any, makeNormative() as any, makeDescriptor() as any, dictionary as any);
      const result = await service.generateSections('report1', [SectionTypeEnum.RESULTS_SYNTHESIS], USER);
      expect(result[SectionTypeEnum.RESULTS_SYNTHESIS]).toContain('síntesis');
    });

    it('returns empty string for SOCIAL_COGNITION when framework is not SNP_CHC', async () => {
      const report = makeReport({ frameworkCode: 'STANDARD' });
      const prisma = makePrisma(report);
      const service = new RulesEngineService(prisma as any, makeNormative() as any, makeDescriptor() as any, makeDictionary() as any);
      const result = await service.generateSections('report1', [SectionTypeEnum.SOCIAL_COGNITION], USER);
      expect(result[SectionTypeEnum.SOCIAL_COGNITION]).toBe('');
    });
  });
});
