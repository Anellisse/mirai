import { DescriptorService } from '../descriptor.service';

const WISC_SS_RANGES = [
  { id: '1', scaleCode: 'WISC_SS', minScore: 0, maxScore: 69, label: 'Extremadamente bajo', labelShort: 'EB', orderIndex: 1 },
  { id: '2', scaleCode: 'WISC_SS', minScore: 70, maxScore: 79, label: 'Limítrofe', labelShort: 'LM', orderIndex: 2 },
  { id: '3', scaleCode: 'WISC_SS', minScore: 80, maxScore: 89, label: 'Medio bajo', labelShort: 'MBaj', orderIndex: 3 },
  { id: '4', scaleCode: 'WISC_SS', minScore: 90, maxScore: 109, label: 'Medio', labelShort: 'M', orderIndex: 4 },
  { id: '5', scaleCode: 'WISC_SS', minScore: 110, maxScore: 119, label: 'Medio alto', labelShort: 'MAlt', orderIndex: 5 },
  { id: '6', scaleCode: 'WISC_SS', minScore: 120, maxScore: 129, label: 'Superior', labelShort: 'S', orderIndex: 6 },
  { id: '7', scaleCode: 'WISC_SS', minScore: 130, maxScore: 999, label: 'Muy alto', labelShort: 'MA', orderIndex: 7 },
];

const NEURO_Z_RANGES = [
  { id: '1', scaleCode: 'NEURO_Z', minScore: -99, maxScore: -2.01, label: 'Muy bajo', labelShort: 'MB', orderIndex: 1 },
  { id: '2', scaleCode: 'NEURO_Z', minScore: -2.0, maxScore: -1.51, label: 'Bajo', labelShort: 'B', orderIndex: 2 },
  { id: '3', scaleCode: 'NEURO_Z', minScore: -1.5, maxScore: -1.01, label: 'Bajo promedio', labelShort: 'BP', orderIndex: 3 },
  { id: '4', scaleCode: 'NEURO_Z', minScore: -1.0, maxScore: 0.99, label: 'Promedio', labelShort: 'P', orderIndex: 4 },
  { id: '5', scaleCode: 'NEURO_Z', minScore: 1.0, maxScore: 1.49, label: 'Alto promedio', labelShort: 'AP', orderIndex: 5 },
  { id: '6', scaleCode: 'NEURO_Z', minScore: 1.5, maxScore: 1.99, label: 'Alto', labelShort: 'A', orderIndex: 6 },
  { id: '7', scaleCode: 'NEURO_Z', minScore: 2.0, maxScore: 99, label: 'Muy alto', labelShort: 'MA', orderIndex: 7 },
];

function makePrisma(ranges = WISC_SS_RANGES) {
  return { descriptorRange: { findMany: jest.fn().mockResolvedValue(ranges) } };
}

describe('DescriptorService', () => {
  it('returns correct label for score in range', async () => {
    const prisma = makePrisma();
    const service = new DescriptorService(prisma as any);
    const result = await service.describe({ standardScore: 100, scaleCode: 'WISC_SS' });
    expect(result.label).toBe('Medio');
    expect(result.labelShort).toBe('M');
  });

  it('returns lowest label when score is below all ranges', async () => {
    const prisma = makePrisma();
    const service = new DescriptorService(prisma as any);
    const result = await service.describe({ standardScore: -50, scaleCode: 'WISC_SS' });
    expect(result.label).toBe('Extremadamente bajo');
  });

  it('returns highest label when score exceeds all ranges', async () => {
    const prisma = makePrisma();
    const service = new DescriptorService(prisma as any);
    const result = await service.describe({ standardScore: 1000, scaleCode: 'WISC_SS' });
    expect(result.label).toBe('Muy alto');
  });

  it('returns boundary labels correctly (69 → EB, 70 → LM)', async () => {
    const prisma = makePrisma();
    const service = new DescriptorService(prisma as any);
    const r1 = await service.describe({ standardScore: 69, scaleCode: 'WISC_SS' });
    const r2 = await service.describe({ standardScore: 70, scaleCode: 'WISC_SS' });
    expect(r1.label).toBe('Extremadamente bajo');
    expect(r2.label).toBe('Limítrofe');
  });

  it('handles isInverse correctly (high raw = low score, e.g. TMT seconds)', async () => {
    const prisma = makePrisma(NEURO_Z_RANGES);
    const service = new DescriptorService(prisma as any);
    // raw z = -2.5 (already inverted by NormativeService when isInverse=true on formula)
    // DescriptorService receives the already-inverted z, and isInverse here is for display only
    const result = await service.describe({ standardScore: -2.5, scaleCode: 'NEURO_Z' });
    expect(result.label).toBe('Muy bajo');
  });

  it('returns fallback when no ranges defined', async () => {
    const prisma = makePrisma([]);
    const service = new DescriptorService(prisma as any);
    const result = await service.describe({ standardScore: 100, scaleCode: 'MISSING' });
    expect(result.label).toBe('Sin descriptor');
  });
});
