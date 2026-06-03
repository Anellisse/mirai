import { ForbiddenException } from '@nestjs/common';
import { Role, UserPayload } from '@mirai/shared-types';
import { AuditService } from '../audit.service';

const ADMIN: UserPayload = { sub: 'admin-1', organizationId: 'org-1', role: Role.ADMIN, email: 'a@b.cl', twoFactorVerified: true };
const CLINICO: UserPayload = { sub: 'cli-1', organizationId: 'org-1', role: Role.CLINICO, email: 'c@b.cl', twoFactorVerified: true };

const FAKE_LOGS = [{ id: 'log-1', action: 'ACCESS_REQUESTED', createdAt: new Date() }];

function makePrisma() {
  return {
    auditLog: {
      findMany: jest.fn().mockResolvedValue(FAKE_LOGS),
      count: jest.fn().mockResolvedValue(1),
    },
  };
}

describe('AuditService', () => {
  it('returns paginated logs for admin', async () => {
    const prisma = makePrisma();
    const svc = new AuditService(prisma as any);
    const result = await svc.findAll(ADMIN, 1);
    expect(result.data).toEqual(FAKE_LOGS);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 50 }),
    );
  });

  it('throws ForbiddenException for non-admin', async () => {
    const svc = new AuditService(makePrisma() as any);
    await expect(svc.findAll(CLINICO, 1)).rejects.toThrow(ForbiddenException);
  });

  it('applies correct pagination offset for page 2', async () => {
    const prisma = makePrisma();
    const svc = new AuditService(prisma as any);
    await svc.findAll(ADMIN, 2);
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 50, take: 50 }),
    );
  });
});
