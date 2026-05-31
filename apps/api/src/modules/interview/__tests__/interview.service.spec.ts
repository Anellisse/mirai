import { InterviewService } from '../interview.service';
import { Role } from '@mirai/shared-types';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

const user: any = { sub: 'author-1', role: Role.CLINICO, organizationId: 'org-1' };
const form = { id: 'form-1', reportId: 'report-1', data: { section1: { whyConsults: 'test' } } };

function makeReportsService(checkShouldReject?: Error) {
  return {
    checkEditAccess: checkShouldReject
      ? jest.fn().mockRejectedValue(checkShouldReject)
      : jest.fn().mockResolvedValue(undefined),
  };
}

function makePrisma(overrides: Record<string, any> = {}) {
  return {
    interviewForm: {
      findUnique: jest.fn().mockResolvedValue(form),
      upsert: jest.fn().mockResolvedValue(form),
      ...overrides.interviewForm,
    },
  };
}

describe('InterviewService', () => {
  describe('getInterview', () => {
    it('returns the interview form when it exists', async () => {
      const prisma = makePrisma();
      const rs = makeReportsService();
      const service = new InterviewService(prisma as any, rs as any);
      const result = await service.getInterview('report-1', user);
      expect(result).toEqual(form);
      expect(prisma.interviewForm.findUnique).toHaveBeenCalledWith({ where: { reportId: 'report-1' } });
    });

    it('returns null when no form exists yet', async () => {
      const prisma = makePrisma({ interviewForm: { findUnique: jest.fn().mockResolvedValue(null) } });
      const rs = makeReportsService();
      const service = new InterviewService(prisma as any, rs as any);
      const result = await service.getInterview('report-1', user);
      expect(result).toBeNull();
    });

    it('throws NotFoundException when checkEditAccess throws it', async () => {
      const prisma = makePrisma();
      const rs = makeReportsService(new NotFoundException());
      const service = new InterviewService(prisma as any, rs as any);
      await expect(service.getInterview('bad-id', user)).rejects.toThrow(NotFoundException);
    });
  });

  describe('upsertInterview', () => {
    it('upserts the interview form data', async () => {
      const prisma = makePrisma();
      const rs = makeReportsService();
      const service = new InterviewService(prisma as any, rs as any);
      const dto = { data: { section1: { whyConsults: 'dolor de cabeza' } } };
      await service.upsertInterview('report-1', dto, user);
      expect(prisma.interviewForm.upsert).toHaveBeenCalledWith({
        where: { reportId: 'report-1' },
        update: { data: dto.data },
        create: { reportId: 'report-1', data: dto.data },
      });
    });

    it('calls checkEditAccess before writing', async () => {
      const prisma = makePrisma();
      const rs = makeReportsService();
      const service = new InterviewService(prisma as any, rs as any);
      await service.upsertInterview('report-1', { data: {} }, user);
      expect(rs.checkEditAccess).toHaveBeenCalledWith('report-1', user);
    });

    it('propagates ForbiddenException from checkEditAccess', async () => {
      const prisma = makePrisma();
      const rs = makeReportsService(new ForbiddenException());
      const service = new InterviewService(prisma as any, rs as any);
      await expect(service.upsertInterview('report-1', { data: {} }, user)).rejects.toThrow(ForbiddenException);
    });
  });
});
