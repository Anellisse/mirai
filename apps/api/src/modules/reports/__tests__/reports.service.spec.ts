import { ReportsService } from '../reports.service';
import { Role } from '@mirai/shared-types';
import { SectionType } from '@prisma/client';

const author: any = { sub: 'author-1', role: Role.CLINICO, organizationId: 'org-1', twoFactorVerified: true, email: 'a@a.com' };

const ALL_SECTION_TYPES = Object.values(SectionType);

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    report: {
      create: jest.fn().mockResolvedValue({ id: 'report-1', status: 'DRAFT' }),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ id: 'report-1' }),
      ...overrides,
    },
    reportSection: {
      createMany: jest.fn().mockResolvedValue({ count: ALL_SECTION_TYPES.length }),
      update: jest.fn().mockResolvedValue({ id: 'sec-1' }),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({}),
    },
  };
}

function makeStateMachine(nextStatus = 'IN_PROGRESS') {
  return { transition: jest.fn().mockReturnValue(nextStatus) };
}

describe('ReportsService', () => {
  describe('create', () => {
    it('creates a report with DRAFT status', async () => {
      const prisma = makePrisma();
      const sm = makeStateMachine();
      const service = new ReportsService(prisma as any, sm as any);
      await service.create(
        { patientId: 'p-1', frameworkCode: 'SNP-CHC', selectedTests: ['WISC-V'] },
        author,
      );
      expect(prisma.report.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'DRAFT', authorId: 'author-1' }),
        }),
      );
    });

    it('initializes all section types as PENDING', async () => {
      const prisma = makePrisma();
      const sm = makeStateMachine();
      const service = new ReportsService(prisma as any, sm as any);
      await service.create(
        { patientId: 'p-1', frameworkCode: 'SNP-CHC', selectedTests: [] },
        author,
      );
      expect(prisma.reportSection.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining(
            ALL_SECTION_TYPES.map((t) => expect.objectContaining({ sectionType: t, status: 'PENDING' })),
          ),
        }),
      );
    });
  });

  describe('saveSection', () => {
    it('updates section content and sets status to CLINICIAN_REVIEWING when previously PENDING', async () => {
      const prisma = makePrisma();
      prisma.reportSection.findFirst = jest.fn().mockResolvedValue({
        id: 'sec-1',
        status: 'PENDING',
        generatedBy: 'HUMAN',
      });
      // findFirst for report ownership check
      prisma.report.findFirst = jest.fn().mockResolvedValue({
        id: 'report-1',
        authorId: 'author-1',
        supervisorId: null,
        status: 'IN_PROGRESS',
      });
      const sm = makeStateMachine();
      const service = new ReportsService(prisma as any, sm as any);
      await service.saveSection('report-1', 'BACKGROUND', 'content here', author);
      expect(prisma.reportSection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ content: 'content here', status: 'CLINICIAN_REVIEWING' }),
        }),
      );
    });
  });

  describe('executeTransition', () => {
    it('calls state machine and persists new status', async () => {
      const prisma = makePrisma();
      prisma.report.findFirst = jest.fn().mockResolvedValue({
        id: 'report-1',
        authorId: 'author-1',
        supervisorId: null,
        status: 'DRAFT',
        sections: [],
        finalReport: null,
      });
      const sm = makeStateMachine('IN_PROGRESS');
      const service = new ReportsService(prisma as any, sm as any);
      await service.executeTransition('report-1', 'start', author);
      expect(sm.transition).toHaveBeenCalled();
      expect(prisma.report.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'IN_PROGRESS' }) }),
      );
    });
  });
});
