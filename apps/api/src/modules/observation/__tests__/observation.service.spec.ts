import { ObservationService } from '../observation.service';
import { Role } from '@mirai/shared-types';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

const user: any = { sub: 'author-1', role: Role.CLINICO, organizationId: 'org-1' };
const checklist = { id: 'obs-1', reportId: 'report-1', data: { cooperacion: 0, motivacion: 1 } };

function makeReportsService(checkShouldReject?: Error) {
  return {
    checkEditAccess: checkShouldReject
      ? jest.fn().mockRejectedValue(checkShouldReject)
      : jest.fn().mockResolvedValue(undefined),
  };
}

function makePrisma(overrides: Record<string, any> = {}) {
  return {
    observationChecklist: {
      findUnique: jest.fn().mockResolvedValue(checklist),
      upsert: jest.fn().mockResolvedValue(checklist),
      ...overrides.observationChecklist,
    },
  };
}

describe('ObservationService', () => {
  describe('getObservation', () => {
    it('returns the checklist when it exists', async () => {
      const prisma = makePrisma();
      const rs = makeReportsService();
      const service = new ObservationService(prisma as any, rs as any);
      const result = await service.getObservation('report-1', user);
      expect(result).toEqual(checklist);
      expect(prisma.observationChecklist.findUnique).toHaveBeenCalledWith({ where: { reportId: 'report-1' } });
    });

    it('returns null when no checklist exists', async () => {
      const prisma = makePrisma({ observationChecklist: { findUnique: jest.fn().mockResolvedValue(null) } });
      const rs = makeReportsService();
      const service = new ObservationService(prisma as any, rs as any);
      const result = await service.getObservation('report-1', user);
      expect(result).toBeNull();
    });

    it('throws when checkEditAccess throws NotFoundException', async () => {
      const prisma = makePrisma();
      const rs = makeReportsService(new NotFoundException());
      const service = new ObservationService(prisma as any, rs as any);
      await expect(service.getObservation('bad', user)).rejects.toThrow(NotFoundException);
    });
  });

  describe('upsertObservation', () => {
    it('calls checkEditAccess and upserts data', async () => {
      const prisma = makePrisma();
      const rs = makeReportsService();
      const service = new ObservationService(prisma as any, rs as any);
      const dto = { data: { cooperacion: 2, nivelActividad: 'hiper' } };
      await service.upsertObservation('report-1', dto, user);
      expect(rs.checkEditAccess).toHaveBeenCalledWith('report-1', user);
      expect(prisma.observationChecklist.upsert).toHaveBeenCalledWith({
        where: { reportId: 'report-1' },
        update: { data: dto.data },
        create: { reportId: 'report-1', data: dto.data },
      });
    });

    it('propagates ForbiddenException', async () => {
      const prisma = makePrisma();
      const rs = makeReportsService(new ForbiddenException());
      const service = new ObservationService(prisma as any, rs as any);
      await expect(service.upsertObservation('report-1', { data: {} }, user)).rejects.toThrow(ForbiddenException);
    });
  });
});
