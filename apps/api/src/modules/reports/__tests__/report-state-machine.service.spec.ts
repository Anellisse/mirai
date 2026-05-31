import { ConflictException, ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import { ReportStateMachineService } from '../report-state-machine.service';
import { Role } from '@mirai/shared-types';
import { ReportStatus, SectionStatus, GeneratedBy } from '@prisma/client';

const author: any = { sub: 'author-1', role: Role.CLINICO, organizationId: 'org-1', twoFactorVerified: true, email: 'a@a.com' };
const senior: any = { sub: 'author-1', role: Role.CLINICO_SENIOR, organizationId: 'org-1', twoFactorVerified: true, email: 'a@a.com' };
const supervisor: any = { sub: 'supervisor-1', role: Role.SUPERVISOR, organizationId: 'org-1', twoFactorVerified: true, email: 's@a.com' };
const other: any = { sub: 'other-1', role: Role.CLINICO, organizationId: 'org-1', twoFactorVerified: true, email: 'o@a.com' };

function makeReport(overrides: Partial<any> = {}): any {
  return {
    id: 'report-1',
    authorId: 'author-1',
    supervisorId: null,
    status: ReportStatus.DRAFT,
    sections: [],
    finalReport: null,
    ...overrides,
  };
}

function makeAiSection(status: SectionStatus = SectionStatus.AI_GENERATED): any {
  return { generatedBy: GeneratedBy.AI, status };
}

describe('ReportStateMachineService', () => {
  let service: ReportStateMachineService;

  beforeEach(() => {
    service = new ReportStateMachineService();
  });

  describe('DRAFT → IN_PROGRESS (start)', () => {
    it('succeeds when user is author', () => {
      const report = makeReport({ status: ReportStatus.DRAFT });
      expect(service.transition(report, 'start', author)).toBe(ReportStatus.IN_PROGRESS);
    });

    it('throws ForbiddenException when user is not author', () => {
      const report = makeReport({ status: ReportStatus.DRAFT });
      expect(() => service.transition(report, 'start', other)).toThrow(ForbiddenException);
    });
  });

  describe('IN_PROGRESS → REVIEW (submit)', () => {
    it('succeeds when no unreviewed AI sections', () => {
      const report = makeReport({ status: ReportStatus.IN_PROGRESS });
      expect(service.transition(report, 'submit', author)).toBe(ReportStatus.REVIEW);
    });

    it('throws UnprocessableEntityException when AI section is unreviewed', () => {
      const report = makeReport({
        status: ReportStatus.IN_PROGRESS,
        sections: [makeAiSection(SectionStatus.AI_GENERATED)],
      });
      expect(() => service.transition(report, 'submit', author)).toThrow(UnprocessableEntityException);
    });

    it('succeeds when AI section has been reviewed', () => {
      const report = makeReport({
        status: ReportStatus.IN_PROGRESS,
        sections: [makeAiSection(SectionStatus.CLINICIAN_REVIEWING)],
      });
      expect(service.transition(report, 'submit', author)).toBe(ReportStatus.REVIEW);
    });
  });

  describe('REVIEW → SUPERVISOR_REVIEW (submit)', () => {
    it('succeeds when supervisor assigned and user is author', () => {
      const report = makeReport({ status: ReportStatus.REVIEW, supervisorId: 'supervisor-1' });
      expect(service.transition(report, 'submit', author)).toBe(ReportStatus.SUPERVISOR_REVIEW);
    });

    it('succeeds when supervisor assigned and user is supervisor', () => {
      const report = makeReport({ status: ReportStatus.REVIEW, supervisorId: 'supervisor-1' });
      expect(service.transition(report, 'submit', supervisor)).toBe(ReportStatus.SUPERVISOR_REVIEW);
    });
  });

  describe('REVIEW → APPROVED (approve)', () => {
    it('succeeds for CLINICO_SENIOR with no supervisor assigned', () => {
      const report = makeReport({ status: ReportStatus.REVIEW, supervisorId: null });
      expect(service.transition(report, 'approve', senior)).toBe(ReportStatus.APPROVED);
    });

    it('throws ForbiddenException for CLINICO (not senior) trying to approve', () => {
      const report = makeReport({ status: ReportStatus.REVIEW, supervisorId: null });
      expect(() => service.transition(report, 'approve', author)).toThrow(ForbiddenException);
    });

    it('throws ConflictException when supervisor assigned (must go through SUPERVISOR_REVIEW)', () => {
      const report = makeReport({ status: ReportStatus.REVIEW, supervisorId: 'supervisor-1' });
      expect(() => service.transition(report, 'approve', senior)).toThrow(ConflictException);
    });
  });

  describe('SUPERVISOR_REVIEW → APPROVED (approve)', () => {
    it('succeeds when user is the assigned supervisor', () => {
      const report = makeReport({ status: ReportStatus.SUPERVISOR_REVIEW, supervisorId: 'supervisor-1' });
      expect(service.transition(report, 'approve', supervisor)).toBe(ReportStatus.APPROVED);
    });

    it('throws ForbiddenException when user is not the supervisor', () => {
      const report = makeReport({ status: ReportStatus.SUPERVISOR_REVIEW, supervisorId: 'supervisor-1' });
      expect(() => service.transition(report, 'approve', author)).toThrow(ForbiddenException);
    });
  });

  describe('APPROVED → EXPORTED (export)', () => {
    it('succeeds for author', () => {
      const report = makeReport({ status: ReportStatus.APPROVED });
      expect(service.transition(report, 'export', author)).toBe(ReportStatus.EXPORTED);
    });
  });

  describe('EXPORTED → FINAL (finalize)', () => {
    it('succeeds when finalReport exists', () => {
      const report = makeReport({ status: ReportStatus.EXPORTED, finalReport: { id: 'fr-1' } });
      expect(service.transition(report, 'finalize', author)).toBe(ReportStatus.FINAL);
    });

    it('throws ConflictException when no finalReport', () => {
      const report = makeReport({ status: ReportStatus.EXPORTED, finalReport: null });
      expect(() => service.transition(report, 'finalize', author)).toThrow(ConflictException);
    });
  });

  describe('invalid transitions', () => {
    it('throws ConflictException for unknown action in current state', () => {
      const report = makeReport({ status: ReportStatus.DRAFT });
      expect(() => service.transition(report, 'approve', author)).toThrow(ConflictException);
    });

    it('throws ConflictException for unknown action string', () => {
      const report = makeReport({ status: ReportStatus.IN_PROGRESS });
      expect(() => service.transition(report, 'finalize' as any, author)).toThrow(ConflictException);
    });
  });
});
