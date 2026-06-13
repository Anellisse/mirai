import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@mirai/shared-types';
import { SectionStatus, GeneratedBy } from '@prisma/client';
import { ProcedureService } from '../procedure.service';

const user: any = { sub: 'user-1', role: Role.CLINICO, organizationId: 'org-1' };

const mockReport = {
  selectedTests: ['WISC-V', 'BASC-3'],
  frameworkCode: 'SNP_CHC',
  patient: { name: 'Agustina Pérez' },
};

const mockSection = {
  id: 'sec-1',
  content: null,
  status: SectionStatus.PENDING,
  sourceData: null,
};

const mockTests = [
  { code: 'WISC-V', name: 'Escala de Inteligencia de Wechsler para Niños, quinta edición (WISC-V)', type: 'intelligence', orderIndex: 1 },
  { code: 'BASC-3', name: 'Sistema de Evaluación de la Conducta de Niños y Adolescentes, tercera edición (BASC-3)', type: 'questionnaire', orderIndex: 11 },
];

function makePrisma(overrides: Record<string, any> = {}) {
  return {
    report: {
      findUnique: jest.fn().mockResolvedValue(mockReport),
      update: jest.fn().mockResolvedValue(mockReport),
      ...overrides.report,
    },
    reportSection: {
      findFirst: jest.fn().mockResolvedValue(mockSection),
      update: jest.fn().mockResolvedValue({
        ...mockSection,
        content: 'Procedimiento\nSe realizó entrevista',
        status: SectionStatus.CLINICIAN_REVIEWING,
      }),
      ...overrides.reportSection,
    },
    cognitiveTest: {
      findMany: jest.fn().mockResolvedValue(mockTests),
      ...overrides.cognitiveTest,
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({}),
      ...overrides.auditLog,
    },
  };
}

function makeReportsService(error?: Error) {
  return {
    checkEditAccess: error
      ? jest.fn().mockRejectedValue(error)
      : jest.fn().mockResolvedValue(undefined),
  };
}

const baseDto: any = {
  selectedTests: ['WISC-V', 'BASC-3'],
  interviewWith: 'PARENTS',
  interviewModality: 'PRESENCIAL',
  adirModality: 'PRESENCIAL',
  questionnairesShared: false,
  questionnaireRespondent: null,
};

describe('ProcedureService', () => {
  describe('getProcedure', () => {
    it('returns combined report + section data', async () => {
      const service = new ProcedureService(makePrisma() as any, makeReportsService() as any);
      const result = await service.getProcedure('report-1', user);
      expect(result.selectedTests).toEqual(['WISC-V', 'BASC-3']);
      expect(result.frameworkCode).toBe('SNP_CHC');
      expect(result.content).toBeNull();
      expect(result.sectionStatus).toBe(SectionStatus.PENDING);
    });

    it('throws when checkEditAccess rejects', async () => {
      const service = new ProcedureService(makePrisma() as any, makeReportsService(new NotFoundException()) as any);
      await expect(service.getProcedure('bad', user)).rejects.toThrow(NotFoundException);
    });

    it('calls checkEditAccess with reportId and user', async () => {
      const prisma = makePrisma();
      const rs = makeReportsService();
      const service = new ProcedureService(prisma as any, rs as any);
      await service.getProcedure('report-1', user);
      expect(rs.checkEditAccess).toHaveBeenCalledWith('report-1', user);
    });
  });

  describe('upsertProcedure', () => {
    it('updates selectedTests on report', async () => {
      const prisma = makePrisma();
      const service = new ProcedureService(prisma as any, makeReportsService() as any);
      await service.upsertProcedure('report-1', baseDto, user);
      expect(prisma.report.update).toHaveBeenCalledWith({
        where: { id: 'report-1' },
        data: { selectedTests: baseDto.selectedTests },
      });
    });

    it('saves section with RULES generatedBy and CLINICIAN_REVIEWING status', async () => {
      const prisma = makePrisma();
      const service = new ProcedureService(prisma as any, makeReportsService() as any);
      await service.upsertProcedure('report-1', baseDto, user);
      expect(prisma.reportSection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            generatedBy: GeneratedBy.RULES,
            status: SectionStatus.CLINICIAN_REVIEWING,
          }),
        }),
      );
    });

    it('returns content, status and sourceData', async () => {
      const service = new ProcedureService(makePrisma() as any, makeReportsService() as any);
      const result = await service.upsertProcedure('report-1', baseDto, user);
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('sourceData');
    });

    it('throws BadRequestException when questionnairesShared but no questionnaire tests selected', async () => {
      const prisma = makePrisma({
        cognitiveTest: {
          findMany: jest.fn()
            .mockResolvedValueOnce([]) // first call (validation query returns empty)
            .mockResolvedValue(mockTests),
        },
      });
      const service = new ProcedureService(prisma as any, makeReportsService() as any);
      const dto = { ...baseDto, questionnairesShared: true, questionnaireRespondent: 'FAMILY' };
      await expect(service.upsertProcedure('report-1', dto, user)).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException when access denied', async () => {
      const service = new ProcedureService(makePrisma() as any, makeReportsService(new ForbiddenException()) as any);
      await expect(service.upsertProcedure('report-1', baseDto, user)).rejects.toThrow(ForbiddenException);
    });

    it('creates audit log entry', async () => {
      const prisma = makePrisma();
      const service = new ProcedureService(prisma as any, makeReportsService() as any);
      await service.upsertProcedure('report-1', baseDto, user);
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'SECTION_SAVED', resource: 'ReportSection' }),
        }),
      );
    });

    it('calls checkEditAccess with reportId and user', async () => {
      const prisma = makePrisma();
      const rs = makeReportsService();
      const service = new ProcedureService(prisma as any, rs as any);
      await service.upsertProcedure('report-1', baseDto, user);
      expect(rs.checkEditAccess).toHaveBeenCalledWith('report-1', user);
    });

    it('throws NotFoundException when section not found', async () => {
      const prisma = makePrisma({
        reportSection: {
          findFirst: jest.fn().mockResolvedValue(null),
          update: jest.fn(),
        },
      });
      const service = new ProcedureService(prisma as any, makeReportsService() as any);
      await expect(service.upsertProcedure('report-1', baseDto, user)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when section is already APPROVED', async () => {
      const prisma = makePrisma({
        reportSection: {
          findFirst: jest.fn().mockResolvedValue({ ...mockSection, status: SectionStatus.APPROVED }),
          update: jest.fn(),
        },
      });
      const service = new ProcedureService(prisma as any, makeReportsService() as any);
      await expect(service.upsertProcedure('report-1', baseDto, user)).rejects.toThrow(ForbiddenException);
    });
  });
});
