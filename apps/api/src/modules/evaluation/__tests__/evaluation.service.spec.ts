import { Role, UserPayload } from '@mirai/shared-types';
import { EvaluationService } from '../evaluation.service';

const USER: UserPayload = { sub: 'user1', organizationId: 'org1', role: Role.CLINICO_SENIOR, email: 'a@b.com', twoFactorVerified: true };

const mockReport = { selectedTests: ['WISC-V', 'TMT'] };

const mockResults = [
  {
    id: 'tr1', reportId: 'rep1', testId: 'test-wisc', scores: { ICV: 100 }, createdAt: new Date(),
    test: { code: 'WISC-V', scoreSlots: [], name: 'WISC-V' },
  },
  {
    id: 'tr2', reportId: 'rep1', testId: 'test-tmt', scores: { TMT_A_SEG: 45 }, createdAt: new Date(),
    test: { code: 'TMT', scoreSlots: [], name: 'TMT' },
  },
];

function makePrisma(existing: object | null = null) {
  return {
    report: { findUnique: jest.fn().mockResolvedValue(mockReport) },
    testResult: {
      findMany: jest.fn().mockResolvedValue(mockResults),
      findUnique: jest.fn().mockResolvedValue(existing),
      create: jest.fn().mockResolvedValue({ id: 'new-tr' }),
      update: jest.fn().mockResolvedValue({ id: 'tr1' }),
    },
  };
}

const mockReportsService = { checkEditAccess: jest.fn().mockResolvedValue(undefined) };

describe('EvaluationService', () => {
  describe('getTestResults', () => {
    it('checks edit access and returns test results for selected tests', async () => {
      const prisma = makePrisma();
      const service = new EvaluationService(prisma as any, mockReportsService as any);
      const result = await service.getTestResults('rep1', USER);
      expect(mockReportsService.checkEditAccess).toHaveBeenCalledWith('rep1', USER);
      expect(result).toHaveLength(2);
    });

    it('filters out test results for tests not in selectedTests', async () => {
      const prisma = makePrisma();
      prisma.report.findUnique = jest.fn().mockResolvedValue({ selectedTests: ['WISC-V'] });
      prisma.testResult.findMany = jest.fn().mockResolvedValue(mockResults);
      const service = new EvaluationService(prisma as any, mockReportsService as any);
      const result = await service.getTestResults('rep1', USER);
      expect(result).toHaveLength(1);
      expect(result[0].test.code).toBe('WISC-V');
    });
  });

  describe('upsertScores', () => {
    it('creates a new TestResult when none exists', async () => {
      const prisma = makePrisma(null);
      const service = new EvaluationService(prisma as any, mockReportsService as any);
      await service.upsertScores('rep1', 'test-wisc', { scores: { ICV: 105 } }, USER);
      expect(prisma.testResult.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ reportId: 'rep1', testId: 'test-wisc' }) }),
      );
    });

    it('updates existing TestResult when one exists', async () => {
      const existing = { id: 'tr1', reportId: 'rep1', testId: 'test-wisc', scores: { ICV: 100 } };
      const prisma = makePrisma(existing);
      const service = new EvaluationService(prisma as any, mockReportsService as any);
      await service.upsertScores('rep1', 'test-wisc', { scores: { ICV: 110 } }, USER);
      expect(prisma.testResult.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'tr1' }, data: expect.objectContaining({ scores: { ICV: 110 } }) }),
      );
    });

    it('accepts null values in scores (slot not recorded)', async () => {
      const prisma = makePrisma(null);
      const service = new EvaluationService(prisma as any, mockReportsService as any);
      await service.upsertScores('rep1', 'test-wisc', { scores: { ICV: null, IVE: 95 } }, USER);
      expect(prisma.testResult.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ scores: { ICV: null, IVE: 95 } }) }),
      );
    });
  });
});
