import { ConclusionService } from '../conclusion.service';
import { DiagnosticStatusDto } from '../dto/upsert-conclusion.dto';
import { Role } from '@mirai/shared-types';
import { ForbiddenException } from '@nestjs/common';

const user: any = { sub: 'author-1', role: Role.CLINICO, organizationId: 'org-1' };
const org = { id: 'org-1', closingNoteTemplate: 'Texto de cierre org.' };
const report = { id: 'report-1', organizationId: 'org-1', authorId: 'author-1' };

const obsData = {
  cooperacion: 0,
  motivacion: 1,
  ansiedad: 0,
  toleranciaFrustracion: 1,
  atencionSostenida: 2,
  nivelActividad: 'hiper',
  impulsividad: 1,
  fatiga: 0,
  comprensionInstrucciones: 0,
  expresionVerbal: 'fluida',
  calidadLenguaje: 0,
  contactoVisual: 0,
  reciprocidadSocial: 0,
  relacionEvaluador: 0,
  coordinacionMotora: 0,
  conductasEstereotipadas: 0,
  rigidezConductual: 0,
  additionalObservations: '',
};

function makeReportsService(checkShouldReject?: Error) {
  return {
    checkEditAccess: checkShouldReject
      ? jest.fn().mockRejectedValue(checkShouldReject)
      : jest.fn().mockResolvedValue(undefined),
  };
}

function makePrisma(overrides: Record<string, any> = {}) {
  const prisma: any = {
    report: { findFirst: jest.fn().mockResolvedValue(report) },
    organization: { findUnique: jest.fn().mockResolvedValue(org) },
    observationChecklist: { findUnique: jest.fn().mockResolvedValue({ data: obsData }) },
    clinicalConclusion: {
      findUnique: jest.fn().mockResolvedValue({ id: 'c-1', reportId: 'report-1', hypotheses: [] }),
      upsert: jest.fn().mockResolvedValue({ id: 'c-1', reportId: 'report-1', ...overrides.conclusionResult }),
      ...overrides.clinicalConclusion,
    },
    diagnosticHypothesis: {
      deleteMany: jest.fn().mockResolvedValue({}),
      createMany: jest.fn().mockResolvedValue({}),
      ...overrides.diagnosticHypothesis,
    },
  };
  return prisma;
}

describe('ConclusionService', () => {
  describe('getConclusion', () => {
    it('auto-generates processNarrative from observation when conclusion does not exist', async () => {
      const prisma = makePrisma({ clinicalConclusion: { findUnique: jest.fn().mockResolvedValue(null) } });
      const rs = makeReportsService();
      const service = new ConclusionService(prisma as any, rs as any);
      const result = await service.getConclusion('report-1', user);
      expect(result.processNarrative).toBeDefined();
      expect(typeof result.processNarrative).toBe('string');
      expect(result.processNarrative!.length).toBeGreaterThan(0);
    });

    it('auto-fills closingNote from org template when conclusion does not exist', async () => {
      const prisma = makePrisma({ clinicalConclusion: { findUnique: jest.fn().mockResolvedValue(null) } });
      const rs = makeReportsService();
      const service = new ConclusionService(prisma as any, rs as any);
      const result = await service.getConclusion('report-1', user);
      expect(result.closingNote).toBe('Texto de cierre org.');
    });

    it('returns existing processNarrative without overwriting', async () => {
      const existing = { id: 'c-1', reportId: 'report-1', processNarrative: 'Ya redactado.', closingNote: 'cierre existente', hypotheses: [] };
      const prisma = makePrisma({ clinicalConclusion: { findUnique: jest.fn().mockResolvedValue(existing) } });
      const rs = makeReportsService();
      const service = new ConclusionService(prisma as any, rs as any);
      const result = await service.getConclusion('report-1', user);
      expect(result.processNarrative).toBe('Ya redactado.');
      expect(result.closingNote).toBe('cierre existente');
    });

    it('fills closingNote from org when existing conclusion has no closingNote', async () => {
      const existing = { id: 'c-1', reportId: 'report-1', processNarrative: 'texto', closingNote: null, hypotheses: [] };
      const prisma = makePrisma({ clinicalConclusion: { findUnique: jest.fn().mockResolvedValue(existing) } });
      const rs = makeReportsService();
      const service = new ConclusionService(prisma as any, rs as any);
      const result = await service.getConclusion('report-1', user);
      expect(result.closingNote).toBe('Texto de cierre org.');
    });
  });

  describe('upsertConclusion', () => {
    it('calls checkEditAccess before writing', async () => {
      const prisma = makePrisma();
      const rs = makeReportsService();
      const service = new ConclusionService(prisma as any, rs as any);
      await service.upsertConclusion('report-1', {}, user);
      expect(rs.checkEditAccess).toHaveBeenCalledWith('report-1', user);
    });

    it('assembles content from active blocks', async () => {
      const prisma = makePrisma();
      const rs = makeReportsService();
      const service = new ConclusionService(prisma as any, rs as any);
      const dto = {
        processNarrative: 'Bloque 1.',
        cognitiveImpact: 'Bloque 3.',
        includeEmotionalNote: true,
        emotionalNote: 'Bloque 4.',
        closingNote: 'Bloque 5.',
      };
      await service.upsertConclusion('report-1', dto, user);
      const upsertCall = prisma.clinicalConclusion.upsert.mock.calls[0][0];
      expect(upsertCall.update.content).toContain('Bloque 1.');
      expect(upsertCall.update.content).toContain('Bloque 3.');
      expect(upsertCall.update.content).toContain('Bloque 4.');
      expect(upsertCall.update.content).toContain('Bloque 5.');
    });

    it('omits emotionalNote block when includeEmotionalNote is false', async () => {
      const prisma = makePrisma();
      const rs = makeReportsService();
      const service = new ConclusionService(prisma as any, rs as any);
      const dto = {
        processNarrative: 'Bloque 1.',
        includeEmotionalNote: false,
        emotionalNote: 'No debería aparecer.',
        closingNote: 'Bloque 5.',
      };
      await service.upsertConclusion('report-1', dto, user);
      const upsertCall = prisma.clinicalConclusion.upsert.mock.calls[0][0];
      expect(upsertCall.update.content).not.toContain('No debería aparecer.');
    });

    it('replaces hypotheses when provided', async () => {
      const prisma = makePrisma();
      const rs = makeReportsService();
      const service = new ConclusionService(prisma as any, rs as any);
      const dto = {
        hypotheses: [{ dxCode: 'F90.0', dxName: 'TDAH', specifiers: [], status: DiagnosticStatusDto.PROVISIONAL, orderIndex: 0 }],
      };
      await service.upsertConclusion('report-1', dto, user);
      expect(prisma.diagnosticHypothesis.deleteMany).toHaveBeenCalled();
      expect(prisma.diagnosticHypothesis.createMany).toHaveBeenCalled();
    });

    it('does not touch hypotheses when not provided', async () => {
      const prisma = makePrisma();
      const rs = makeReportsService();
      const service = new ConclusionService(prisma as any, rs as any);
      await service.upsertConclusion('report-1', {}, user);
      expect(prisma.diagnosticHypothesis.deleteMany).not.toHaveBeenCalled();
    });

    it('propagates ForbiddenException from checkEditAccess', async () => {
      const prisma = makePrisma();
      const rs = makeReportsService(new ForbiddenException());
      const service = new ConclusionService(prisma as any, rs as any);
      await expect(service.upsertConclusion('report-1', {}, user)).rejects.toThrow(ForbiddenException);
    });
  });
});
