import { Role, UserPayload } from '@mirai/shared-types';
import { RepositoryService } from '../repository.service';

const USER: UserPayload = {
  sub: 'author-1',
  organizationId: 'org-1',
  role: Role.CLINICO,
  email: 'a@b.cl',
  twoFactorVerified: true,
};

const OTHER: UserPayload = { ...USER, sub: 'other-1', email: 'o@b.cl' };

function makeReport(overrides: Partial<any> = {}): any {
  return {
    id: 'rep-1',
    authorId: 'author-1',
    status: 'FINAL',
    frameworkCode: 'SNP_CHC',
    createdAt: new Date('2026-05-01'),
    patient: { name: 'María Rodríguez López' },
    author: { name: 'Dr. Pérez', title: 'Psicólogo' },
    accessGrants: [],
    accessRequests: [],
    ...overrides,
  };
}

function makePrisma(reports: any[] = [makeReport()]) {
  return {
    report: {
      findMany: jest.fn().mockResolvedValue(reports),
    },
  };
}

describe('RepositoryService', () => {
  describe('maskName', () => {
    it('returns full name for own report (isOwn = true)', async () => {
      const svc = new RepositoryService(makePrisma() as any);
      const result = await svc.findAll(USER.sub, USER.organizationId);
      expect(result[0].patientName).toBe('María Rodríguez López');
      expect(result[0].isOwn).toBe(true);
    });

    it('returns masked name for unowned report without grant', async () => {
      const svc = new RepositoryService(makePrisma() as any);
      const result = await svc.findAll(OTHER.sub, OTHER.organizationId);
      expect(result[0].patientName).toBe('M**** R******** L****');
      expect(result[0].isOwn).toBe(false);
      expect(result[0].hasAccess).toBe(false);
    });

    it('returns full name for unowned report with active grant', async () => {
      const report = makeReport({
        accessGrants: [{ expiresAt: null }],
      });
      const svc = new RepositoryService(makePrisma([report]) as any);
      const result = await svc.findAll(OTHER.sub, OTHER.organizationId);
      expect(result[0].patientName).toBe('María Rodríguez López');
      expect(result[0].hasAccess).toBe(true);
    });

    it('returns masked name for unowned report with expired grant', async () => {
      const report = makeReport({
        accessGrants: [],  // prisma already filters to only active grants
      });
      const svc = new RepositoryService(makePrisma([report]) as any);
      const result = await svc.findAll(OTHER.sub, OTHER.organizationId);
      expect(result[0].patientName).toBe('M**** R******** L****');
      expect(result[0].hasAccess).toBe(false);
    });

    it('pendingRequest is true when PENDING AccessRequest exists', async () => {
      const report = makeReport({
        accessRequests: [{ id: 'req-1', status: 'PENDING' }],
      });
      const svc = new RepositoryService(makePrisma([report]) as any);
      const result = await svc.findAll(OTHER.sub, OTHER.organizationId);
      expect(result[0].pendingRequest).toBe(true);
    });

    it('pendingRequest is false when no pending AccessRequest', async () => {
      const svc = new RepositoryService(makePrisma() as any);
      const result = await svc.findAll(OTHER.sub, OTHER.organizationId);
      expect(result[0].pendingRequest).toBe(false);
    });
  });
});
