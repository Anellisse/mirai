import { DiagnosticCodesService } from '../diagnostic-codes.service';

const codes = [
  { code: 'F84.0', name: 'Trastorno del Espectro Autista', category: 'Trastornos del Neurodesarrollo', specifiers: [], isActive: true },
  { code: 'F90.0', name: 'TDAH presentación combinada', category: 'Trastornos del Neurodesarrollo', specifiers: [], isActive: true },
  { code: 'F41.1', name: 'Trastorno de ansiedad generalizada', category: 'Trastornos de Ansiedad', specifiers: [], isActive: true },
];

function makePrisma(results = codes) {
  return {
    diagnosticCode: { findMany: jest.fn().mockResolvedValue(results) },
  };
}

describe('DiagnosticCodesService', () => {
  it('returns all active codes when no filter', async () => {
    const prisma = makePrisma();
    const service = new DiagnosticCodesService(prisma as any);
    const result = await service.search({});
    expect(prisma.diagnosticCode.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isActive: true }) }),
    );
    expect(result).toHaveLength(3);
  });

  it('filters by category when provided', async () => {
    const prisma = makePrisma();
    const service = new DiagnosticCodesService(prisma as any);
    await service.search({ category: 'Trastornos de Ansiedad' });
    expect(prisma.diagnosticCode.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ category: 'Trastornos de Ansiedad' }) }),
    );
  });

  it('filters by search term in name when q provided', async () => {
    const prisma = makePrisma();
    const service = new DiagnosticCodesService(prisma as any);
    await service.search({ q: 'autista' });
    expect(prisma.diagnosticCode.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          name: expect.objectContaining({ contains: 'autista', mode: 'insensitive' }),
        }),
      }),
    );
  });
});
