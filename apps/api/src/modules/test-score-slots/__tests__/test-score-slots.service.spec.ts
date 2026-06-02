import { TestScoreSlotsService } from '../test-score-slots.service';

const mockSlots = [
  { id: 'slot1', testId: 'test1', key: 'ICV', name: 'Índice de Comprensión Verbal', scoreType: 'SS', descriptorScaleCode: 'WISC_SS', requiresConversion: false, isInverse: false, orderIndex: 1, descriptorScale: { code: 'WISC_SS' } },
  { id: 'slot2', testId: 'test1', key: 'IVP', name: 'Índice de Velocidad de Procesamiento', scoreType: 'SS', descriptorScaleCode: 'WISC_SS', requiresConversion: false, isInverse: false, orderIndex: 5, descriptorScale: { code: 'WISC_SS' } },
];

function makePrisma(slots = mockSlots) {
  return {
    testScoreSlot: {
      findMany: jest.fn().mockResolvedValue(slots),
      findUnique: jest.fn().mockResolvedValue(slots[0]),
    },
  };
}

describe('TestScoreSlotsService', () => {
  it('returns slots filtered by testId ordered by orderIndex', async () => {
    const prisma = makePrisma();
    const service = new TestScoreSlotsService(prisma as any);
    const result = await service.findByTest('test1');
    expect(prisma.testScoreSlot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { testId: 'test1' },
        orderBy: { orderIndex: 'asc' },
      }),
    );
    expect(result).toHaveLength(2);
  });

  it('returns a single slot by id', async () => {
    const prisma = makePrisma();
    const service = new TestScoreSlotsService(prisma as any);
    const result = await service.findOne('slot1');
    expect(prisma.testScoreSlot.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'slot1' } }),
    );
    expect(result?.key).toBe('ICV');
  });
});
