import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PatientsService } from '../patients.service';
import { Role } from '@mirai/shared-types';

process.env.RUT_HMAC_SECRET = 'test-hmac-secret-key-for-jest-do-not-use-in-prod-xx';
process.env.ENCRYPTION_KEY = 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899';

const mockPatient = {
  id: 'patient-1',
  organizationId: 'org-1',
  createdById: 'user-1',
  name: 'Juan Pérez',
  rutEncrypted: null,
  rutHash: null,
  birthDate: new Date('1990-01-15'),
  gender: 'M',
  email: null,
  phone: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    patient: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(mockPatient),
      update: jest.fn().mockResolvedValue(mockPatient),
      count: jest.fn().mockResolvedValue(0),
      ...overrides,
    },
    report: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    accessGrant: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    accessRequest: {
      create: jest.fn().mockResolvedValue({ id: 'req-1' }),
    },
  };
}

function makeEncryption() {
  return {
    normalizeRut: jest.fn((r: string) => r.replace(/[.\-\s]/g, '').toUpperCase()),
    hashRut: jest.fn().mockReturnValue('hash-abc'),
    encryptRut: jest.fn().mockReturnValue('iv:cipher:tag'),
    decryptRut: jest.fn().mockReturnValue('123456789'),
  };
}

describe('PatientsService', () => {
  describe('isAssigned', () => {
    it('returns true when user is the creator', async () => {
      const prisma = makePrisma({
        findFirst: jest.fn().mockResolvedValue(mockPatient),
      });
      const service = new PatientsService(prisma as any, makeEncryption() as any);
      const result = await service.isAssigned('user-1', 'patient-1');
      expect(result).toBe(true);
    });

    it('returns true when user has a report for the patient', async () => {
      const prisma = makePrisma({
        findFirst: jest.fn().mockResolvedValue({ ...mockPatient, createdById: 'other-user' }),
      });
      prisma.report.findFirst = jest.fn().mockResolvedValue({ id: 'report-1' });
      const service = new PatientsService(prisma as any, makeEncryption() as any);
      const result = await service.isAssigned('user-1', 'patient-1');
      expect(result).toBe(true);
    });

    it('returns false when user has no relation to patient', async () => {
      const prisma = makePrisma({
        findFirst: jest.fn().mockResolvedValue({ ...mockPatient, createdById: 'other-user' }),
      });
      const service = new PatientsService(prisma as any, makeEncryption() as any);
      const result = await service.isAssigned('user-1', 'patient-1');
      expect(result).toBe(false);
    });
  });

  describe('findAll', () => {
    it('includes isAssigned flag for each patient', async () => {
      const prisma = makePrisma({
        findMany: jest.fn().mockResolvedValue([mockPatient]),
        findFirst: jest.fn().mockResolvedValue(mockPatient),
      });
      prisma.report.findFirst = jest.fn().mockResolvedValue(null);
      const service = new PatientsService(prisma as any, makeEncryption() as any);
      const result = await service.findAll('user-1', 'org-1', {});
      expect(result[0].isAssigned).toBe(true);
    });

    it('filters by rutHash when rut query param provided', async () => {
      const prisma = makePrisma({ findMany: jest.fn().mockResolvedValue([]) });
      const encryption = makeEncryption();
      const service = new PatientsService(prisma as any, encryption as any);
      await service.findAll('user-1', 'org-1', { rut: '12.345.678-9' });
      expect(encryption.hashRut).toHaveBeenCalledWith('12.345.678-9');
      expect(prisma.patient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ rutHash: 'hash-abc' }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns patient when user is assigned', async () => {
      const prisma = makePrisma({
        findFirst: jest.fn().mockResolvedValue(mockPatient),
      });
      const service = new PatientsService(prisma as any, makeEncryption() as any);
      const result = await service.findOne('patient-1', 'user-1', 'org-1');
      expect(result.id).toBe('patient-1');
    });

    it('throws NotFoundException when patient does not exist', async () => {
      const prisma = makePrisma({ findFirst: jest.fn().mockResolvedValue(null) });
      const service = new PatientsService(prisma as any, makeEncryption() as any);
      await expect(service.findOne('missing', 'user-1', 'org-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user is not assigned and no grant', async () => {
      const prisma = makePrisma({
        findFirst: jest.fn().mockResolvedValue({ ...mockPatient, createdById: 'other' }),
      });
      const service = new PatientsService(prisma as any, makeEncryption() as any);
      await expect(service.findOne('patient-1', 'user-1', 'org-1')).rejects.toThrow(ForbiddenException);
    });

    it('returns patient when user has an active access grant', async () => {
      const prisma = makePrisma({
        findFirst: jest.fn().mockResolvedValue({ ...mockPatient, createdById: 'other' }),
      });
      prisma.accessGrant.findFirst = jest.fn().mockResolvedValue({ id: 'grant-1' });
      const service = new PatientsService(prisma as any, makeEncryption() as any);
      const result = await service.findOne('patient-1', 'user-1', 'org-1');
      expect(result.id).toBe('patient-1');
    });
  });

  describe('create', () => {
    it('stores rutHash and rutEncrypted when RUT provided', async () => {
      const prisma = makePrisma();
      const encryption = makeEncryption();
      const service = new PatientsService(prisma as any, encryption as any);
      await service.create({ name: 'Ana', rut: '12.345.678-9' }, 'user-1', 'org-1');
      expect(encryption.hashRut).toHaveBeenCalledWith('12.345.678-9');
      expect(encryption.encryptRut).toHaveBeenCalledWith('12.345.678-9');
      expect(prisma.patient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ rutHash: 'hash-abc', rutEncrypted: 'iv:cipher:tag' }),
        }),
      );
    });

    it('sets createdById to the calling user', async () => {
      const prisma = makePrisma();
      const service = new PatientsService(prisma as any, makeEncryption() as any);
      await service.create({ name: 'Ana' }, 'user-1', 'org-1');
      expect(prisma.patient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ createdById: 'user-1' }),
        }),
      );
    });
  });
});
