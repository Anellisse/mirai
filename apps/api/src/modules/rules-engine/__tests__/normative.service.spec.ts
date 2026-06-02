import { NormativeService } from '../normative.service';

const makeSlot = (overrides = {}) => ({
  id: 'slot1', key: 'TMT_A_SEG', scoreType: 'Z', requiresConversion: true, isInverse: false,
  ...overrides,
});

const makeLookupTable = (entries: object[]) => ({
  id: 'tbl1', slotId: 'slot1', tableType: 'lookup', isActive: true,
  entries,
});

const makeFormulaTable = (entries: object[]) => ({
  id: 'tbl1', slotId: 'slot1', tableType: 'formula', isActive: true,
  entries,
});

function makePrisma(slot = makeSlot(), tables: object[] = []) {
  return {
    testScoreSlot: { findUnique: jest.fn().mockResolvedValue(slot) },
    normativeTable: { findMany: jest.fn().mockResolvedValue(tables) },
  };
}

describe('NormativeService', () => {
  describe('no requiresConversion', () => {
    it('returns raw score as standardScore when slot does not require conversion', async () => {
      const slot = makeSlot({ requiresConversion: false, scoreType: 'SS' });
      const prisma = makePrisma(slot);
      const service = new NormativeService(prisma as any);
      const result = await service.convert({ slotId: 'slot1', rawScore: 105 });
      expect(result).toEqual({ standardScore: 105, scoreType: 'SS' });
      expect(prisma.normativeTable.findMany).not.toHaveBeenCalled();
    });
  });

  describe('lookup table', () => {
    it('finds matching entry and returns standardScore + percentile', async () => {
      const entry = { ageMin: 20, ageMax: 29, educationYearsMin: null, educationYearsMax: null, gender: null, rawScoreMin: 30, rawScoreMax: 35, standardScore: -1.5, percentile: 7, formulaType: null, parameters: null };
      const prisma = makePrisma(makeSlot(), [makeLookupTable([entry])]);
      const service = new NormativeService(prisma as any);
      const result = await service.convert({ slotId: 'slot1', rawScore: 32, age: 25 });
      expect(result).toEqual({ standardScore: -1.5, scoreType: 'Z', percentile: 7 });
    });

    it('returns null when no entry matches', async () => {
      const entry = { ageMin: 20, ageMax: 29, educationYearsMin: null, educationYearsMax: null, gender: null, rawScoreMin: 30, rawScoreMax: 35, standardScore: -1.5, percentile: 7, formulaType: null, parameters: null };
      const prisma = makePrisma(makeSlot(), [makeLookupTable([entry])]);
      const service = new NormativeService(prisma as any);
      const result = await service.convert({ slotId: 'slot1', rawScore: 99, age: 25 });
      expect(result).toBeNull();
    });

    it('falls back to age-only match when education not in entries', async () => {
      const entry = { ageMin: 20, ageMax: 29, educationYearsMin: null, educationYearsMax: null, gender: null, rawScoreMin: 30, rawScoreMax: 35, standardScore: -1.2, percentile: 11, formulaType: null, parameters: null };
      const prisma = makePrisma(makeSlot(), [makeLookupTable([entry])]);
      const service = new NormativeService(prisma as any);
      const result = await service.convert({ slotId: 'slot1', rawScore: 32, age: 25, educationYears: 16 });
      expect(result?.standardScore).toBe(-1.2);
    });
  });

  describe('formula table — z_transform', () => {
    it('computes z-score correctly', async () => {
      const entry = { ageMin: 20, ageMax: 29, educationYearsMin: null, educationYearsMax: null, gender: null, rawScoreMin: null, rawScoreMax: null, standardScore: null, percentile: null, formulaType: 'z_transform', parameters: { mean: 85.3, sd: 12.1 } };
      const prisma = makePrisma(makeSlot(), [makeFormulaTable([entry])]);
      const service = new NormativeService(prisma as any);
      const result = await service.convert({ slotId: 'slot1', rawScore: 85.3, age: 25 });
      expect(result?.standardScore).toBeCloseTo(0, 5);
    });

    it('inverts z-score when isInverse = true (e.g. TMT seconds)', async () => {
      const slot = makeSlot({ isInverse: true });
      const entry = { ageMin: null, ageMax: null, educationYearsMin: null, educationYearsMax: null, gender: null, rawScoreMin: null, rawScoreMax: null, standardScore: null, percentile: null, formulaType: 'z_transform', parameters: { mean: 50, sd: 10 } };
      const prisma = makePrisma(slot, [makeFormulaTable([entry])]);
      const service = new NormativeService(prisma as any);
      const result = await service.convert({ slotId: 'slot1', rawScore: 70 });
      // z = (70 - 50) / 10 = 2, inverted = -2
      expect(result?.standardScore).toBeCloseTo(-2, 5);
    });
  });

  describe('formula table — linear', () => {
    it('applies linear formula correctly', async () => {
      const entry = { ageMin: null, ageMax: null, educationYearsMin: null, educationYearsMax: null, gender: null, rawScoreMin: null, rawScoreMax: null, standardScore: null, percentile: null, formulaType: 'linear', parameters: { slope: 1.5, intercept: -10 } };
      const prisma = makePrisma(makeSlot(), [makeFormulaTable([entry])]);
      const service = new NormativeService(prisma as any);
      const result = await service.convert({ slotId: 'slot1', rawScore: 20 });
      expect(result?.standardScore).toBeCloseTo(20, 5);
    });
  });

  describe('no table', () => {
    it('returns null when requiresConversion but no active table exists', async () => {
      const prisma = makePrisma(makeSlot(), []);
      const service = new NormativeService(prisma as any);
      const result = await service.convert({ slotId: 'slot1', rawScore: 30 });
      expect(result).toBeNull();
    });
  });

  describe('slot not found', () => {
    it('returns null when slot does not exist', async () => {
      const prisma = { testScoreSlot: { findUnique: jest.fn().mockResolvedValue(null) }, normativeTable: { findMany: jest.fn() } };
      const service = new NormativeService(prisma as any);
      const result = await service.convert({ slotId: 'nonexistent', rawScore: 30 });
      expect(result).toBeNull();
    });
  });
});
