import { DescriptorScalesService } from '../descriptor-scales.service';

const mockScales = [
  {
    code: 'WISC_SS',
    name: 'WISC-V Índices Compuestos (SS)',
    scoreType: 'SS',
    isDefault: false,
    ranges: [
      { id: '1', scaleCode: 'WISC_SS', minScore: 0, maxScore: 69, label: 'Extremadamente bajo', labelShort: 'EB', orderIndex: 1 },
      { id: '2', scaleCode: 'WISC_SS', minScore: 130, maxScore: 999, label: 'Muy alto', labelShort: 'MA', orderIndex: 7 },
    ],
  },
];

function makePrisma(scales = mockScales) {
  return {
    descriptorScale: {
      findMany: jest.fn().mockResolvedValue(scales),
      findUnique: jest.fn().mockResolvedValue(scales[0]),
    },
  };
}

describe('DescriptorScalesService', () => {
  it('returns all scales with ranges ordered by orderIndex', async () => {
    const prisma = makePrisma();
    const service = new DescriptorScalesService(prisma as any);
    const result = await service.findAll();
    expect(prisma.descriptorScale.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({ ranges: expect.objectContaining({ orderBy: { orderIndex: 'asc' } }) }),
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0].ranges).toHaveLength(2);
  });

  it('returns single scale by code', async () => {
    const prisma = makePrisma();
    const service = new DescriptorScalesService(prisma as any);
    const result = await service.findOne('WISC_SS');
    expect(prisma.descriptorScale.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { code: 'WISC_SS' } }),
    );
    expect(result?.code).toBe('WISC_SS');
  });
});
