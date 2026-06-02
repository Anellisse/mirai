import { Role, UserPayload } from '@mirai/shared-types';
import { AnnexTablesService } from '../annex-tables.service';

const USER: UserPayload = { sub: 'user1', organizationId: 'org1', role: Role.CLINICO_SENIOR, email: 'a@b.com', twoFactorVerified: true };

const makeSlot = (overrides = {}) => ({
  id: 's1', testId: 't1', key: 'ICV', name: 'Índice de Comprensión Verbal',
  scoreType: 'SS', descriptorScaleCode: 'WISC_SS', requiresConversion: false,
  isInverse: false, cutoffBorderline: null, cutoffClinicallySignificant: null, orderIndex: 1,
  ...overrides,
});

const makeTestResult = (overrides = {}) => ({
  id: 'tr1', reportId: 'rep1', testId: 't1',
  scores: { ICV: 100 }, descriptor: 'Medio', percentile: 50,
  test: {
    code: 'WISC-V', name: 'WISC-V', type: 'intelligence',
    scoreSlots: [makeSlot()],
  },
  ...overrides,
});

function makePrisma(results: object[] = [makeTestResult()]) {
  return {
    testResult: { findMany: jest.fn().mockResolvedValue(results) },
  };
}

const mockReportsService = { checkEditAccess: jest.fn().mockResolvedValue(undefined) };

describe('AnnexTablesService', () => {
  it('classifies WISC-V SS slots as wechslerIndices', async () => {
    const prisma = makePrisma();
    const service = new AnnexTablesService(prisma as any, mockReportsService as any);
    const result = await service.getAnnexTables('rep1', USER);
    expect(result.wechslerIndices).toHaveLength(1);
    expect(result.wechslerIndices[0]).toMatchObject({ testCode: 'WISC-V', slotKey: 'ICV', standardScore: 100 });
    expect(result.wechslerSubtests).toHaveLength(0);
    expect(result.battery).toHaveLength(0);
    expect(result.questionnaires).toHaveLength(0);
  });

  it('classifies SCALED slots as wechslerSubtests', async () => {
    const slot = makeSlot({ key: 'SEMEJANZAS', name: 'Semejanzas', scoreType: 'SCALED' });
    const tr = makeTestResult({ scores: { SEMEJANZAS: 10 }, test: { code: 'WISC-V', name: 'WISC-V', type: 'intelligence', scoreSlots: [slot] } });
    const prisma = makePrisma([tr]);
    const service = new AnnexTablesService(prisma as any, mockReportsService as any);
    const result = await service.getAnnexTables('rep1', USER);
    expect(result.wechslerSubtests).toHaveLength(1);
    expect(result.wechslerSubtests[0].scaledScore).toBe(10);
  });

  it('classifies questionnaire slots as questionnaires with classification', async () => {
    const slot = makeSlot({ key: 'BAI_TOTAL', name: 'Total', scoreType: 'RAW', cutoffBorderline: 16, cutoffClinicallySignificant: 22 });
    const tr = makeTestResult({ scores: { BAI_TOTAL: 25 }, descriptor: null, test: { code: 'BAI', name: 'BAI', type: 'questionnaire', scoreSlots: [slot] } });
    const prisma = makePrisma([tr]);
    const service = new AnnexTablesService(prisma as any, mockReportsService as any);
    const result = await service.getAnnexTables('rep1', USER);
    expect(result.questionnaires).toHaveLength(1);
    expect(result.questionnaires[0].classification).toBe('Clínicamente significativo');
  });

  it('classifies questionnaire score below cutoff as Normal', async () => {
    const slot = makeSlot({ key: 'BAI_TOTAL', scoreType: 'RAW', cutoffBorderline: 16, cutoffClinicallySignificant: 22 });
    const tr = makeTestResult({ scores: { BAI_TOTAL: 10 }, test: { code: 'BAI', name: 'BAI', type: 'questionnaire', scoreSlots: [slot] } });
    const prisma = makePrisma([tr]);
    const service = new AnnexTablesService(prisma as any, mockReportsService as any);
    const result = await service.getAnnexTables('rep1', USER);
    expect(result.questionnaires[0].classification).toBe('Normal');
  });

  it('classifies Z-score neuropsychological tests as battery', async () => {
    const slot = makeSlot({ key: 'TMT_A_SEG', name: 'TMT-A seg', scoreType: 'Z' });
    const tr = makeTestResult({ scores: { TMT_A_SEG: 55 }, test: { code: 'TMT', name: 'TMT', type: 'cognitive', scoreSlots: [slot] } });
    const prisma = makePrisma([tr]);
    const service = new AnnexTablesService(prisma as any, mockReportsService as any);
    const result = await service.getAnnexTables('rep1', USER);
    expect(result.battery).toHaveLength(1);
    expect(result.battery[0].scoreType).toBe('Z');
  });

  it('handles missing score for a slot (null rawScore)', async () => {
    const tr = makeTestResult({ scores: {} });
    const prisma = makePrisma([tr]);
    const service = new AnnexTablesService(prisma as any, mockReportsService as any);
    const result = await service.getAnnexTables('rep1', USER);
    expect(result.wechslerIndices[0].standardScore).toBeNull();
  });
});

describe('AnnexTablesService — getCognitiveProfile', () => {
  const domain = { id: 'dom1', code: 'INTELIGENCIA', name: 'Inteligencia', axis: 1, orderIndex: 0 };

  function makeProfilePrisma(descriptor: string | null = 'Medio') {
    return {
      report: {
        findUnique: jest.fn().mockResolvedValue({
          frameworkCode: 'SNP_CHC',
          selectedTests: ['WISC-V'],
          testResults: [
            {
              id: 'tr1', descriptor,
              test: { code: 'WISC-V', type: 'intelligence', domain },
            },
          ],
        }),
      },
    };
  }

  it('returns domain scores aggregated from test results', async () => {
    const prisma = makeProfilePrisma('Medio');
    const service = new AnnexTablesService(prisma as any, mockReportsService as any);
    const result = await service.getCognitiveProfile('rep1', USER);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ domainCode: 'INTELIGENCIA', avgScore: 4, descriptorLabel: 'Promedio' });
  });

  it('maps descriptor labels to correct numeric scores', async () => {
    for (const [label, expectedScore] of [
      ['Muy bajo', 1], ['Limítrofe', 2], ['Medio', 4], ['Medio alto', 5], ['Muy alto', 7],
    ] as [string, number][]) {
      const prisma = makeProfilePrisma(label);
      const service = new AnnexTablesService(prisma as any, mockReportsService as any);
      const result = await service.getCognitiveProfile('rep1', USER);
      expect(result[0].avgScore).toBe(expectedScore);
    }
  });

  it('returns empty array when no test results with descriptors', async () => {
    const prisma = makeProfilePrisma(null);
    const service = new AnnexTablesService(prisma as any, mockReportsService as any);
    const result = await service.getCognitiveProfile('rep1', USER);
    expect(result).toHaveLength(0);
  });

  it('excludes questionnaire tests from profile', async () => {
    const prisma = {
      report: {
        findUnique: jest.fn().mockResolvedValue({
          frameworkCode: 'SNP_CHC',
          selectedTests: ['BAI'],
          testResults: [{ id: 'tr1', descriptor: 'Clínicamente significativo', test: { code: 'BAI', type: 'questionnaire', domain } }],
        }),
      },
    };
    const service = new AnnexTablesService(prisma as any, mockReportsService as any);
    const result = await service.getCognitiveProfile('rep1', USER);
    expect(result).toHaveLength(0);
  });
});
