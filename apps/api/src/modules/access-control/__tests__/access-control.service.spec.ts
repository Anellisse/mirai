import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role, UserPayload } from '@mirai/shared-types';
import { AccessControlService } from '../access-control.service';

const ADMIN: UserPayload = { sub: 'admin-1', organizationId: 'org-1', role: Role.ADMIN, email: 'a@b.cl', twoFactorVerified: true };
const CLINICO: UserPayload = { sub: 'cli-1', organizationId: 'org-1', role: Role.CLINICO, email: 'c@b.cl', twoFactorVerified: true };
const AUTHOR: UserPayload = { sub: 'author-1', organizationId: 'org-1', role: Role.CLINICO, email: 'au@b.cl', twoFactorVerified: true };

const BASE_REPORT = { id: 'rep-1', authorId: 'author-1', organizationId: 'org-1', deletedAt: null };
const BASE_REQUEST = { id: 'req-1', requesterId: 'cli-1', reportId: 'rep-1', status: 'PENDING', patientId: null };

function makePrisma(overrides: Partial<any> = {}) {
  return {
    report: { findFirst: jest.fn().mockResolvedValue(BASE_REPORT) },
    accessRequest: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(BASE_REQUEST),
      create: jest.fn().mockResolvedValue({ id: 'req-1' }),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
    },
    accessGrant: { create: jest.fn().mockResolvedValue({}) },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn().mockImplementation(async (ops: any[]) => Promise.all(ops)),
    ...overrides,
  };
}

describe('AccessControlService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createRequest', () => {
    it('creates AccessRequest and AuditLog for valid request', async () => {
      const prisma = makePrisma();
      const svc = new AccessControlService(prisma as any);
      await svc.createRequest('rep-1', 'Motivo de ejemplo para test', CLINICO);
      expect(prisma.accessRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ reportId: 'rep-1', requesterId: 'cli-1' }) }),
      );
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it('throws NotFoundException when report does not exist', async () => {
      const prisma = makePrisma();
      prisma.report.findFirst = jest.fn().mockResolvedValue(null);
      const svc = new AccessControlService(prisma as any);
      await expect(svc.createRequest('rep-x', 'Motivo', CLINICO)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when requesting own report', async () => {
      const prisma = makePrisma();
      const svc = new AccessControlService(prisma as any);
      await expect(svc.createRequest('rep-1', 'Motivo', AUTHOR)).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when PENDING request already exists', async () => {
      const prisma = makePrisma();
      prisma.accessRequest.findFirst = jest.fn().mockResolvedValue({ id: 'existing' });
      const svc = new AccessControlService(prisma as any);
      await expect(svc.createRequest('rep-1', 'Motivo', CLINICO)).rejects.toThrow(ConflictException);
    });
  });

  describe('approve', () => {
    it('creates AccessGrant with null expiresAt for permanent', async () => {
      const prisma = makePrisma();
      const svc = new AccessControlService(prisma as any);
      await svc.approve('req-1', 'permanent', ADMIN);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.accessGrant.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ expiresAt: null }) }),
      );
    });

    it('creates AccessGrant with ~24h expiresAt for 24h duration', async () => {
      const prisma = makePrisma();
      const before = Date.now();
      const svc = new AccessControlService(prisma as any);
      await svc.approve('req-1', '24h', ADMIN);
      const createCall = (prisma.accessGrant.create as jest.Mock).mock.calls[0][0];
      const expiresAt: Date = createCall.data.expiresAt;
      expect(expiresAt).toBeInstanceOf(Date);
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + 23 * 60 * 60 * 1000);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 25 * 60 * 60 * 1000);
    });

    it('throws ForbiddenException for non-admin', async () => {
      const prisma = makePrisma();
      const svc = new AccessControlService(prisma as any);
      await expect(svc.approve('req-1', 'permanent', CLINICO)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when request does not exist', async () => {
      const prisma = makePrisma();
      prisma.accessRequest.findUnique = jest.fn().mockResolvedValue(null);
      const svc = new AccessControlService(prisma as any);
      await expect(svc.approve('req-x', 'permanent', ADMIN)).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when request is not PENDING', async () => {
      const prisma = makePrisma();
      prisma.accessRequest.findUnique = jest.fn().mockResolvedValue({ ...BASE_REQUEST, status: 'APPROVED' });
      const svc = new AccessControlService(prisma as any);
      await expect(svc.approve('req-1', 'permanent', ADMIN)).rejects.toThrow(ConflictException);
    });
  });

  describe('reject', () => {
    it('updates request to REJECTED with reason and creates AuditLog', async () => {
      const prisma = makePrisma();
      const svc = new AccessControlService(prisma as any);
      await svc.reject('req-1', 'No corresponde', ADMIN);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.accessRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'REJECTED', rejectionReason: 'No corresponde' }) }),
      );
    });

    it('throws ForbiddenException for non-admin', async () => {
      const prisma = makePrisma();
      const svc = new AccessControlService(prisma as any);
      await expect(svc.reject('req-1', 'motivo', CLINICO)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when request does not exist', async () => {
      const prisma = makePrisma();
      prisma.accessRequest.findUnique = jest.fn().mockResolvedValue(null);
      const svc = new AccessControlService(prisma as any);
      await expect(svc.reject('req-x', 'motivo', ADMIN)).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when request is not PENDING', async () => {
      const prisma = makePrisma();
      prisma.accessRequest.findUnique = jest.fn().mockResolvedValue({ ...BASE_REQUEST, status: 'REJECTED' });
      const svc = new AccessControlService(prisma as any);
      await expect(svc.reject('req-1', 'motivo', ADMIN)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('returns all org requests for admin', async () => {
      const prisma = makePrisma();
      const svc = new AccessControlService(prisma as any);
      await svc.findAll(ADMIN);
      const whereArg = (prisma.accessRequest.findMany as jest.Mock).mock.calls[0][0].where;
      expect(whereArg).toHaveProperty('report');
    });

    it('returns only own requests for clinico', async () => {
      const prisma = makePrisma();
      const svc = new AccessControlService(prisma as any);
      await svc.findAll(CLINICO);
      const whereArg = (prisma.accessRequest.findMany as jest.Mock).mock.calls[0][0].where;
      expect(whereArg).toHaveProperty('requesterId', CLINICO.sub);
    });
  });
});
