# Patients CRUD + Report State Machine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full CRUD for patients (with encrypted RUT search) and a typed report state machine in NestJS, then wire up the corresponding Next.js pages.

**Architecture:** API-first — NestJS modules (EncryptionModule, PatientsModule, ReportsModule) are built and tested before the web pages. The state machine lives in a dedicated `ReportStateMachineService` so transitions are testable in isolation. Web pages use a typed `apiClient` wrapper over `fetch`.

**Tech Stack:** NestJS + Prisma + class-validator (API); Next.js App Router + Tailwind + shadcn/ui (Web); Jest + @nestjs/testing (tests); pnpm workspaces + turbo.

---

## File Map

### API — new files
```
apps/api/src/modules/encryption/encryption.service.ts
apps/api/src/modules/encryption/encryption.module.ts
apps/api/src/modules/encryption/__tests__/encryption.service.spec.ts
apps/api/src/modules/patients/patients.service.ts
apps/api/src/modules/patients/patients.controller.ts
apps/api/src/modules/patients/patients.module.ts
apps/api/src/modules/patients/dto/create-patient.dto.ts
apps/api/src/modules/patients/dto/update-patient.dto.ts
apps/api/src/modules/patients/dto/patient-query.dto.ts
apps/api/src/modules/patients/__tests__/patients.service.spec.ts
apps/api/src/modules/reports/report-state-machine.service.ts
apps/api/src/modules/reports/reports.service.ts
apps/api/src/modules/reports/reports.controller.ts
apps/api/src/modules/reports/reports.module.ts
apps/api/src/modules/reports/dto/create-report.dto.ts
apps/api/src/modules/reports/dto/update-report.dto.ts
apps/api/src/modules/reports/dto/transition-report.dto.ts
apps/api/src/modules/reports/dto/update-section.dto.ts
apps/api/src/modules/reports/__tests__/report-state-machine.service.spec.ts
apps/api/src/modules/reports/__tests__/reports.service.spec.ts
```

### API — modified files
```
prisma/schema.prisma               (add createdById/rutHash to Patient; patientId to AccessRequest/AccessGrant; make reportId optional)
apps/api/src/app.module.ts         (register PatientsModule, ReportsModule)
apps/api/.env.example              (add RUT_HMAC_SECRET, ENCRYPTION_KEY)
apps/api/.env                      (add RUT_HMAC_SECRET, ENCRYPTION_KEY — dev values)
```

### Web — new files
```
apps/web/src/lib/api-client.ts
apps/web/src/app/(dashboard)/patients/page.tsx
apps/web/src/app/(dashboard)/patients/_components/patient-table.tsx
apps/web/src/app/(dashboard)/patients/new/page.tsx
apps/web/src/app/(dashboard)/patients/new/_components/patient-form.tsx
apps/web/src/app/(dashboard)/patients/[id]/page.tsx
apps/web/src/app/(dashboard)/patients/[id]/_components/patient-info.tsx
apps/web/src/app/(dashboard)/patients/[id]/_components/report-list.tsx
apps/web/src/app/(dashboard)/reports/new/page.tsx
apps/web/src/app/(dashboard)/reports/new/_components/step-framework.tsx
apps/web/src/app/(dashboard)/reports/new/_components/step-tests.tsx
apps/web/src/app/(dashboard)/reports/new/_components/step-confirm.tsx
apps/web/src/app/(dashboard)/reports/[id]/page.tsx
apps/web/src/app/(dashboard)/reports/[id]/_components/report-overview.tsx
apps/web/src/app/(dashboard)/reports/[id]/_components/section-list.tsx
apps/web/src/app/(dashboard)/reports/[id]/_components/transition-button.tsx
```

---

## Task 1: Update Prisma schema + run migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Update Patient model**

In `prisma/schema.prisma`, replace the Patient model with:

```prisma
model Patient {
  id             String    @id @default(cuid())
  organizationId String
  createdById    String
  rutEncrypted   String?
  rutHash        String?
  name           String
  birthDate      DateTime?
  gender         String?
  email          String?
  phone          String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  deletedAt      DateTime?

  organization    Organization    @relation(fields: [organizationId], references: [id])
  createdBy       User            @relation("CreatedPatients", fields: [createdById], references: [id])
  reports         Report[]
  accessRequests  AccessRequest[]
  accessGrants    AccessGrant[]
}
```

- [ ] **Step 2: Add inverse relation to User model**

Inside the `User` model, add after `grantedAccess AccessGrant[] @relation("GrantedByUser")`:

```prisma
  createdPatients Patient[] @relation("CreatedPatients")
```

- [ ] **Step 3: Update AccessRequest model**

Replace `AccessRequest` with:

```prisma
model AccessRequest {
  id              String              @id @default(cuid())
  requesterId     String
  reportId        String?
  patientId       String?
  reason          String
  status          AccessRequestStatus @default(PENDING)
  reviewedById    String?
  reviewedAt      DateTime?
  rejectionReason String?
  createdAt       DateTime            @default(now())

  requester  User         @relation("RequesterRequests", fields: [requesterId], references: [id])
  reviewedBy User?        @relation("ReviewerRequests", fields: [reviewedById], references: [id])
  report     Report?      @relation(fields: [reportId], references: [id])
  patient    Patient?     @relation(fields: [patientId], references: [id])
  grant      AccessGrant?
}
```

- [ ] **Step 4: Update AccessGrant model**

Replace `AccessGrant` with:

```prisma
model AccessGrant {
  id          String    @id @default(cuid())
  requestId   String    @unique
  userId      String
  reportId    String?
  patientId   String?
  expiresAt   DateTime?
  grantedById String
  createdAt   DateTime  @default(now())

  request   AccessRequest @relation(fields: [requestId], references: [id])
  user      User          @relation("UserGrants", fields: [userId], references: [id])
  report    Report?       @relation(fields: [reportId], references: [id])
  patient   Patient?      @relation(fields: [patientId], references: [id])
  grantedBy User          @relation("GrantedByUser", fields: [grantedById], references: [id])
}
```

- [ ] **Step 5: Run migration**

```bash
pnpm db:migrate
# When prompted for migration name, enter: add_patient_rut_hash_and_access_control
```

Expected output: `Your database is now in sync with your schema.`

- [ ] **Step 6: Regenerate Prisma client**

```bash
pnpm db:generate
```

Expected output: `✔ Generated Prisma Client`

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(prisma): add rutHash/createdById to Patient, extend access control models"
```

---

## Task 2: Add encryption env vars

**Files:**
- Modify: `apps/api/.env.example`, `apps/api/.env`

- [ ] **Step 1: Update .env.example**

Add to `apps/api/.env.example`:

```
RUT_HMAC_SECRET="change_me_64_chars_minimum_for_rut_hmac_secret_key_here_xxxxxx"
ENCRYPTION_KEY="0000000000000000000000000000000000000000000000000000000000000000"
```

`ENCRYPTION_KEY` must be exactly 64 hex characters (32 bytes for AES-256-GCM).

- [ ] **Step 2: Generate real dev values and add to .env**

Run in PowerShell to generate values:

```powershell
# Generate HMAC secret (64 random chars)
-join ((48..57) + (97..102) | Get-Random -Count 64 | ForEach-Object { [char]$_ })
# Generate AES key (64 hex chars = 32 bytes)
-join ((48..57) + (97..102) | Get-Random -Count 64 | ForEach-Object { [char]$_ })
```

Add the generated values to `apps/api/.env`:

```
RUT_HMAC_SECRET="<generated-64-char-string>"
ENCRYPTION_KEY="<generated-64-hex-char-string>"
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/.env.example
git commit -m "feat(api): add RUT_HMAC_SECRET and ENCRYPTION_KEY env vars"
```

(Do NOT commit `.env` — it is already in `.gitignore`.)

---

## Task 3: EncryptionService (TDD)

**Files:**
- Create: `apps/api/src/modules/encryption/encryption.service.ts`
- Create: `apps/api/src/modules/encryption/encryption.module.ts`
- Create: `apps/api/src/modules/encryption/__tests__/encryption.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/api/src/modules/encryption/__tests__/encryption.service.spec.ts`:

```typescript
import { EncryptionService } from '../encryption.service';

// Set env vars before instantiating
process.env.RUT_HMAC_SECRET = 'test-hmac-secret-key-for-jest-do-not-use-in-prod-xx';
process.env.ENCRYPTION_KEY = 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(() => {
    service = new EncryptionService();
  });

  describe('normalizeRut', () => {
    it('strips dots, dash and spaces', () => {
      expect(service.normalizeRut('12.345.678-9')).toBe('123456789');
    });

    it('handles RUT with no formatting', () => {
      expect(service.normalizeRut('123456789')).toBe('123456789');
    });

    it('uppercases the verification digit K', () => {
      expect(service.normalizeRut('9.999.999-k')).toBe('9999999K');
    });
  });

  describe('hashRut', () => {
    it('produces consistent output for same input', () => {
      const h1 = service.hashRut('12.345.678-9');
      const h2 = service.hashRut('12.345.678-9');
      expect(h1).toBe(h2);
    });

    it('normalizes before hashing', () => {
      expect(service.hashRut('12.345.678-9')).toBe(service.hashRut('123456789'));
    });

    it('produces different hashes for different RUTs', () => {
      expect(service.hashRut('12.345.678-9')).not.toBe(service.hashRut('9.876.543-2'));
    });

    it('returns a 64-char hex string', () => {
      expect(service.hashRut('12.345.678-9')).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('encryptRut / decryptRut', () => {
    it('roundtrip returns original normalized RUT', () => {
      const rut = '12.345.678-9';
      const cipher = service.encryptRut(rut);
      expect(service.decryptRut(cipher)).toBe('123456789');
    });

    it('produces different ciphertext each call (random IV)', () => {
      const c1 = service.encryptRut('12.345.678-9');
      const c2 = service.encryptRut('12.345.678-9');
      expect(c1).not.toBe(c2);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/api && pnpm test -- --testPathPattern=encryption.service.spec
```

Expected: FAIL — `Cannot find module '../encryption.service'`

- [ ] **Step 3: Implement EncryptionService**

Create `apps/api/src/modules/encryption/encryption.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly hmacSecret: string;
  private readonly encryptionKey: Buffer;

  constructor() {
    const hmacSecret = process.env.RUT_HMAC_SECRET;
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!hmacSecret) throw new Error('RUT_HMAC_SECRET is required');
    if (!encryptionKey || encryptionKey.length !== 64)
      throw new Error('ENCRYPTION_KEY must be a 64-char hex string (32 bytes)');
    this.hmacSecret = hmacSecret;
    this.encryptionKey = Buffer.from(encryptionKey, 'hex');
  }

  normalizeRut(rut: string): string {
    return rut.replace(/[.\-\s]/g, '').toUpperCase();
  }

  hashRut(rut: string): string {
    const normalized = this.normalizeRut(rut);
    return crypto.createHmac('sha256', this.hmacSecret).update(normalized).digest('hex');
  }

  encryptRut(rut: string): string {
    const normalized = this.normalizeRut(rut);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(normalized, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${encrypted.toString('hex')}:${authTag.toString('hex')}`;
  }

  decryptRut(cipherText: string): string {
    const [ivHex, encryptedHex, authTagHex] = cipherText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
  }
}
```

- [ ] **Step 4: Create EncryptionModule**

Create `apps/api/src/modules/encryption/encryption.module.ts`:

```typescript
import { Global, Module } from '@nestjs/common';
import { EncryptionService } from './encryption.service';

@Global()
@Module({
  providers: [EncryptionService],
  exports: [EncryptionService],
})
export class EncryptionModule {}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd apps/api && pnpm test -- --testPathPattern=encryption.service.spec
```

Expected: PASS — 8 tests passed.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/encryption/
git commit -m "feat(api): add EncryptionService with RUT normalize/hash/encrypt/decrypt"
```

---

## Task 4: PatientsService (TDD)

**Files:**
- Create: `apps/api/src/modules/patients/patients.service.ts`
- Create: `apps/api/src/modules/patients/__tests__/patients.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/api/src/modules/patients/__tests__/patients.service.spec.ts`:

```typescript
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

const mockUser = {
  sub: 'user-1',
  email: 'test@test.com',
  role: Role.CLINICO,
  organizationId: 'org-1',
  twoFactorVerified: true,
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/api && pnpm test -- --testPathPattern=patients.service.spec
```

Expected: FAIL — `Cannot find module '../patients.service'`

- [ ] **Step 3: Create the DTOs**

Create `apps/api/src/modules/patients/dto/create-patient.dto.ts`:

```typescript
import { IsDateString, IsEmail, IsOptional, IsString, Matches } from 'class-validator';

export class CreatePatientDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[\d.]+[-][\dkK]$|^\d+[kK]?$/, { message: 'Formato de RUT inválido' })
  rut?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
```

Create `apps/api/src/modules/patients/dto/update-patient.dto.ts`:

```typescript
import { IsDateString, IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdatePatientDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
```

Create `apps/api/src/modules/patients/dto/patient-query.dto.ts`:

```typescript
import { IsOptional, IsString } from 'class-validator';

export class PatientQueryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  rut?: string;
}
```

- [ ] **Step 4: Implement PatientsService**

Create `apps/api/src/modules/patients/patients.service.ts`:

```typescript
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientQueryDto } from './dto/patient-query.dto';

@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async isAssigned(userId: string, patientId: string): Promise<boolean> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, deletedAt: null },
    });
    if (!patient) return false;
    if (patient.createdById === userId) return true;

    const report = await this.prisma.report.findFirst({
      where: {
        patientId,
        deletedAt: null,
        OR: [{ authorId: userId }, { supervisorId: userId }],
      },
    });
    return !!report;
  }

  private async hasActiveGrant(userId: string, patientId: string): Promise<boolean> {
    const grant = await this.prisma.accessGrant.findFirst({
      where: {
        userId,
        patientId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
    return !!grant;
  }

  async findAll(userId: string, organizationId: string, query: PatientQueryDto) {
    const where: Record<string, unknown> = {
      organizationId,
      deletedAt: null,
    };

    if (query.rut) {
      where.rutHash = this.encryption.hashRut(query.rut);
    }

    if (query.name) {
      where.name = { contains: query.name, mode: 'insensitive' };
    }

    const patients = await this.prisma.patient.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        birthDate: true,
        gender: true,
        createdById: true,
        _count: { select: { reports: { where: { deletedAt: null } } } },
      },
    });

    return Promise.all(
      patients.map(async (p) => {
        const assigned = await this.isAssigned(userId, p.id);
        const base = {
          id: p.id,
          name: p.name,
          isAssigned: assigned,
          reportCount: p._count.reports,
        };
        if (!assigned) return base;
        return { ...base, birthDate: p.birthDate, gender: p.gender };
      }),
    );
  }

  async findOne(patientId: string, userId: string, organizationId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, organizationId, deletedAt: null },
      include: {
        reports: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          select: { id: true, status: true, frameworkCode: true, createdAt: true },
        },
      },
    });

    if (!patient) throw new NotFoundException('Paciente no encontrado');

    const assigned = await this.isAssigned(userId, patientId);
    const granted = !assigned && (await this.hasActiveGrant(userId, patientId));

    if (!assigned && !granted) throw new ForbiddenException('Sin acceso al paciente');

    const { rutEncrypted, ...safe } = patient;
    const rut = rutEncrypted ? this.encryption.decryptRut(rutEncrypted) : null;
    return { ...safe, rut };
  }

  async create(dto: CreatePatientDto, userId: string, organizationId: string) {
    const data: Record<string, unknown> = {
      name: dto.name,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      gender: dto.gender,
      email: dto.email,
      phone: dto.phone,
      organizationId,
      createdById: userId,
    };

    if (dto.rut) {
      data.rutHash = this.encryption.hashRut(dto.rut);
      data.rutEncrypted = this.encryption.encryptRut(dto.rut);
    }

    return this.prisma.patient.create({ data: data as any });
  }

  async update(patientId: string, dto: UpdatePatientDto, userId: string, organizationId: string) {
    const assigned = await this.isAssigned(userId, patientId);
    if (!assigned) throw new ForbiddenException('Sin acceso al paciente');

    return this.prisma.patient.update({
      where: { id: patientId },
      data: {
        name: dto.name,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        gender: dto.gender,
        email: dto.email,
        phone: dto.phone,
      },
    });
  }

  async remove(patientId: string, organizationId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, organizationId, deletedAt: null },
    });
    if (!patient) throw new NotFoundException('Paciente no encontrado');
    return this.prisma.patient.update({
      where: { id: patientId },
      data: { deletedAt: new Date() },
    });
  }

  async requestAccess(patientId: string, requesterId: string, reason: string) {
    return this.prisma.accessRequest.create({
      data: { requesterId, patientId, reason },
    });
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd apps/api && pnpm test -- --testPathPattern=patients.service.spec
```

Expected: PASS — all tests green.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/patients/
git commit -m "feat(api): add PatientsService with RUT search and access control"
```

---

## Task 5: PatientsController + Module

**Files:**
- Create: `apps/api/src/modules/patients/patients.controller.ts`
- Create: `apps/api/src/modules/patients/patients.module.ts`

- [ ] **Step 1: Create PatientsController**

Create `apps/api/src/modules/patients/patients.controller.ts`:

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role, UserPayload } from '@mirai/shared-types';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientQueryDto } from './dto/patient-query.dto';

@Controller('patients')
@UseGuards(JwtAuthGuard)
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  @Get()
  findAll(@CurrentUser() user: UserPayload, @Query() query: PatientQueryDto) {
    return this.patients.findAll(user.sub, user.organizationId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.patients.findOne(id, user.sub, user.organizationId);
  }

  @Post()
  create(@Body() dto: CreatePatientDto, @CurrentUser() user: UserPayload) {
    return this.patients.create(dto, user.sub, user.organizationId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePatientDto, @CurrentUser() user: UserPayload) {
    return this.patients.update(id, dto, user.sub, user.organizationId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.patients.remove(id, user.organizationId);
  }

  @Post(':id/access-requests')
  requestAccess(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.patients.requestAccess(id, user.sub, reason);
  }
}
```

- [ ] **Step 2: Create PatientsModule**

Create `apps/api/src/modules/patients/patients.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';

@Module({
  controllers: [PatientsController],
  providers: [PatientsService, PrismaService],
  exports: [PatientsService],
})
export class PatientsModule {}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/patients/patients.controller.ts apps/api/src/modules/patients/patients.module.ts
git commit -m "feat(api): add PatientsController and PatientsModule"
```

---

## Task 6: ReportStateMachineService (TDD)

**Files:**
- Create: `apps/api/src/modules/reports/report-state-machine.service.ts`
- Create: `apps/api/src/modules/reports/__tests__/report-state-machine.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/api/src/modules/reports/__tests__/report-state-machine.service.spec.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/api && pnpm test -- --testPathPattern=report-state-machine.service.spec
```

Expected: FAIL — `Cannot find module '../report-state-machine.service'`

- [ ] **Step 3: Implement ReportStateMachineService**

Create `apps/api/src/modules/reports/report-state-machine.service.ts`:

```typescript
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ReportStatus, SectionStatus, GeneratedBy } from '@prisma/client';
import { UserPayload, Role } from '@mirai/shared-types';

export type TransitionAction = 'start' | 'submit' | 'approve' | 'export' | 'finalize';

interface ReportWithSections {
  id: string;
  authorId: string;
  supervisorId: string | null;
  status: ReportStatus;
  sections: Array<{ generatedBy: GeneratedBy; status: SectionStatus }>;
  finalReport: { id: string } | null;
}

const SENIOR_OR_ABOVE: Role[] = [Role.CLINICO_SENIOR, Role.ADMIN, Role.SUPER_ADMIN];

@Injectable()
export class ReportStateMachineService {
  transition(report: ReportWithSections, action: TransitionAction, user: UserPayload): ReportStatus {
    const isAuthor = report.authorId === user.sub;
    const isSupervisor = !!report.supervisorId && report.supervisorId === user.sub;
    const isAuthorOrSupervisor = isAuthor || isSupervisor;
    const isSeniorOrAbove = SENIOR_OR_ABOVE.includes(user.role);

    switch (report.status) {
      case ReportStatus.DRAFT: {
        if (action !== 'start') this.invalidTransition(report.status, action);
        if (!isAuthor) throw new ForbiddenException('Solo el autor puede iniciar el informe');
        return ReportStatus.IN_PROGRESS;
      }

      case ReportStatus.IN_PROGRESS: {
        if (action !== 'submit') this.invalidTransition(report.status, action);
        if (!isAuthor) throw new ForbiddenException('Solo el autor puede enviar a revisión');
        this.assertNoUnreviewedAiSections(report);
        return ReportStatus.REVIEW;
      }

      case ReportStatus.REVIEW: {
        if (action === 'submit') {
          if (!isAuthorOrSupervisor) throw new ForbiddenException('Sin permiso para avanzar');
          if (!report.supervisorId)
            throw new ConflictException('No hay supervisor asignado para enviar a revisión supervisada');
          return ReportStatus.SUPERVISOR_REVIEW;
        }
        if (action === 'approve') {
          if (!isSeniorOrAbove) throw new ForbiddenException('Se requiere rol Clínico Senior o superior');
          if (report.supervisorId)
            throw new ConflictException('El informe tiene supervisor asignado: debe pasar por revisión supervisada');
          return ReportStatus.APPROVED;
        }
        this.invalidTransition(report.status, action);
      }

      case ReportStatus.SUPERVISOR_REVIEW: {
        if (action !== 'approve') this.invalidTransition(report.status, action);
        if (!isSupervisor) throw new ForbiddenException('Solo el supervisor asignado puede aprobar');
        return ReportStatus.APPROVED;
      }

      case ReportStatus.APPROVED: {
        if (action !== 'export') this.invalidTransition(report.status, action);
        if (!isAuthorOrSupervisor) throw new ForbiddenException('Sin permiso para exportar');
        return ReportStatus.EXPORTED;
      }

      case ReportStatus.EXPORTED: {
        if (action !== 'finalize') this.invalidTransition(report.status, action);
        if (!isAuthorOrSupervisor) throw new ForbiddenException('Sin permiso para finalizar');
        if (!report.finalReport)
          throw new ConflictException('Debe existir un informe final antes de finalizar');
        return ReportStatus.FINAL;
      }

      default:
        throw new ConflictException(`El informe en estado ${report.status} no admite transiciones`);
    }
  }

  private assertNoUnreviewedAiSections(report: ReportWithSections): void {
    const pending = report.sections.filter(
      (s) => s.generatedBy === GeneratedBy.AI && s.status === SectionStatus.AI_GENERATED,
    );
    if (pending.length > 0) {
      throw new UnprocessableEntityException({
        message: 'Hay secciones generadas por IA sin revisar',
        pendingSections: pending,
      });
    }
  }

  private invalidTransition(status: ReportStatus, action: string): never {
    throw new ConflictException(`Acción '${action}' no válida para informe en estado ${status}`);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/api && pnpm test -- --testPathPattern=report-state-machine.service.spec
```

Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/reports/
git commit -m "feat(api): add ReportStateMachineService with full transition logic"
```

---

## Task 7: ReportsService (TDD)

**Files:**
- Create: `apps/api/src/modules/reports/reports.service.ts`
- Create: `apps/api/src/modules/reports/__tests__/reports.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/api/src/modules/reports/__tests__/reports.service.spec.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/api && pnpm test -- --testPathPattern=reports.service.spec
```

Expected: FAIL — `Cannot find module '../reports.service'`

- [ ] **Step 3: Create report DTOs**

Create `apps/api/src/modules/reports/dto/create-report.dto.ts`:

```typescript
import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateReportDto {
  @IsString()
  patientId!: string;

  @IsString()
  frameworkCode!: string;

  @IsArray()
  @IsString({ each: true })
  selectedTests!: string[];

  @IsOptional()
  @IsString()
  supervisorId?: string;
}
```

Create `apps/api/src/modules/reports/dto/update-report.dto.ts`:

```typescript
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateReportDto {
  @IsOptional()
  @IsString()
  consultationReason?: string;

  @IsOptional()
  @IsBoolean()
  omitCit?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedTests?: string[];
}
```

Create `apps/api/src/modules/reports/dto/transition-report.dto.ts`:

```typescript
import { IsIn } from 'class-validator';

export class TransitionReportDto {
  @IsIn(['start', 'submit', 'approve', 'export', 'finalize'])
  action!: string;
}
```

Create `apps/api/src/modules/reports/dto/update-section.dto.ts`:

```typescript
import { IsOptional, IsString } from 'class-validator';

export class UpdateSectionDto {
  @IsOptional()
  @IsString()
  content?: string;
}
```

- [ ] **Step 4: Implement ReportsService**

Create `apps/api/src/modules/reports/reports.service.ts`:

```typescript
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ReportStateMachineService, TransitionAction } from './report-state-machine.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { UserPayload } from '@mirai/shared-types';
import { ReportStatus, SectionStatus, SectionType } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stateMachine: ReportStateMachineService,
  ) {}

  async create(dto: CreateReportDto, user: UserPayload) {
    const report = await this.prisma.report.create({
      data: {
        patientId: dto.patientId,
        authorId: user.sub,
        supervisorId: dto.supervisorId,
        organizationId: user.organizationId,
        status: ReportStatus.DRAFT,
        frameworkCode: dto.frameworkCode,
        selectedTests: dto.selectedTests,
      },
    });

    await this.prisma.reportSection.createMany({
      data: Object.values(SectionType).map((sectionType, i) => ({
        reportId: report.id,
        sectionType,
        status: SectionStatus.PENDING,
        orderIndex: i,
      })),
    });

    await this.prisma.auditLog.create({
      data: { userId: user.sub, action: 'REPORT_CREATED', resource: 'Report', resourceId: report.id },
    });

    return report;
  }

  async findAll(user: UserPayload) {
    return this.prisma.report.findMany({
      where: {
        deletedAt: null,
        OR: [
          { authorId: user.sub },
          { supervisorId: user.sub },
          { accessGrants: { some: { userId: user.sub, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        status: true,
        frameworkCode: true,
        createdAt: true,
        updatedAt: true,
        patient: { select: { id: true, name: true } },
        author: { select: { id: true, name: true } },
      },
    });
  }

  async findOne(reportId: string, user: UserPayload) {
    const report = await this.prisma.report.findFirst({
      where: { id: reportId, deletedAt: null },
      include: {
        sections: { orderBy: { orderIndex: 'asc' } },
        patient: { select: { id: true, name: true } },
        author: { select: { id: true, name: true } },
      },
    });

    if (!report) throw new NotFoundException('Informe no encontrado');

    const canAccess =
      report.authorId === user.sub ||
      report.supervisorId === user.sub ||
      (await this.prisma.accessGrant.findFirst({
        where: {
          userId: user.sub,
          reportId,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      }));

    if (!canAccess) throw new ForbiddenException('Sin acceso al informe');
    return report;
  }

  async update(reportId: string, dto: UpdateReportDto, user: UserPayload) {
    const report = await this.prisma.report.findFirst({
      where: { id: reportId, deletedAt: null, authorId: user.sub },
    });
    if (!report) throw new NotFoundException('Informe no encontrado o sin permiso');

    const editableStatuses: ReportStatus[] = [ReportStatus.DRAFT, ReportStatus.IN_PROGRESS];
    if (!editableStatuses.includes(report.status))
      throw new ForbiddenException('El informe no está en estado editable');

    return this.prisma.report.update({ where: { id: reportId }, data: dto });
  }

  async saveSection(reportId: string, sectionType: string, content: string, user: UserPayload) {
    const report = await this.prisma.report.findFirst({
      where: { id: reportId, deletedAt: null },
    });
    if (!report) throw new NotFoundException('Informe no encontrado');

    const canEdit = report.authorId === user.sub || report.supervisorId === user.sub;
    if (!canEdit) throw new ForbiddenException('Sin permiso para editar secciones');

    const section = await this.prisma.reportSection.findFirst({
      where: { reportId, sectionType: sectionType as SectionType },
    });
    if (!section) throw new NotFoundException('Sección no encontrada');

    const newStatus =
      section.status === SectionStatus.PENDING ? SectionStatus.CLINICIAN_REVIEWING : section.status;

    return this.prisma.reportSection.update({
      where: { id: section.id },
      data: { content, status: newStatus, clinicianEdited: true },
    });
  }

  async approveSection(reportId: string, sectionType: string, user: UserPayload) {
    const report = await this.prisma.report.findFirst({
      where: { id: reportId, deletedAt: null },
    });
    if (!report) throw new NotFoundException('Informe no encontrado');

    const canApprove = report.authorId === user.sub || report.supervisorId === user.sub;
    if (!canApprove) throw new ForbiddenException('Sin permiso para aprobar secciones');

    return this.prisma.reportSection.update({
      where: { reportId_sectionType: { reportId, sectionType: sectionType as SectionType } },
      data: { status: SectionStatus.APPROVED, approvedBy: user.sub, approvedAt: new Date() },
    });
  }

  async executeTransition(reportId: string, action: string, user: UserPayload) {
    const report = await this.prisma.report.findFirst({
      where: { id: reportId, deletedAt: null },
      include: { sections: true, finalReport: { select: { id: true } } },
    });
    if (!report) throw new NotFoundException('Informe no encontrado');

    const nextStatus = this.stateMachine.transition(report, action as TransitionAction, user);

    const updated = await this.prisma.report.update({
      where: { id: reportId },
      data: { status: nextStatus },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.sub,
        action: `REPORT_TRANSITION_${action.toUpperCase()}`,
        resource: 'Report',
        resourceId: reportId,
        metadata: { from: report.status, to: nextStatus },
      },
    });

    return updated;
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd apps/api && pnpm test -- --testPathPattern=reports.service.spec
```

Expected: PASS — all tests green.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/reports/
git commit -m "feat(api): add ReportsService with CRUD, section save, and transition execution"
```

---

## Task 8: ReportsController + Module + AppModule wiring

**Files:**
- Create: `apps/api/src/modules/reports/reports.controller.ts`
- Create: `apps/api/src/modules/reports/reports.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create ReportsController**

Create `apps/api/src/modules/reports/reports.controller.ts`:

```typescript
import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserPayload } from '@mirai/shared-types';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { TransitionReportDto } from './dto/transition-report.dto';
import { UpdateSectionDto } from './dto/update-section.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  create(@Body() dto: CreateReportDto, @CurrentUser() user: UserPayload) {
    return this.reports.create(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: UserPayload) {
    return this.reports.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.reports.findOne(id, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateReportDto, @CurrentUser() user: UserPayload) {
    return this.reports.update(id, dto, user);
  }

  @Post(':id/transition')
  transition(
    @Param('id') id: string,
    @Body() dto: TransitionReportDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.reports.executeTransition(id, dto.action, user);
  }

  @Patch(':id/sections/:sectionType')
  saveSection(
    @Param('id') id: string,
    @Param('sectionType') sectionType: string,
    @Body() dto: UpdateSectionDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.reports.saveSection(id, sectionType, dto.content ?? '', user);
  }

  @Post(':id/sections/:sectionType/approve')
  approveSection(
    @Param('id') id: string,
    @Param('sectionType') sectionType: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.reports.approveSection(id, sectionType, user);
  }
}
```

- [ ] **Step 2: Create ReportsModule**

Create `apps/api/src/modules/reports/reports.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportStateMachineService } from './report-state-machine.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, ReportStateMachineService, PrismaService],
  exports: [ReportsService],
})
export class ReportsModule {}
```

- [ ] **Step 3: Wire up AppModule**

Replace `apps/api/src/app.module.ts` with:

```typescript
import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuthModule } from './modules/auth/auth.module';
import { EncryptionModule } from './modules/encryption/encryption.module';
import { PatientsModule } from './modules/patients/patients.module';
import { ReportsModule } from './modules/reports/reports.module';

@Module({
  imports: [AuthModule, EncryptionModule, PatientsModule, ReportsModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
```

- [ ] **Step 4: Type-check**

```bash
cd apps/api && pnpm type-check
```

Expected: no errors.

- [ ] **Step 5: Run all API tests**

```bash
cd apps/api && pnpm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/reports/reports.controller.ts apps/api/src/modules/reports/reports.module.ts apps/api/src/app.module.ts
git commit -m "feat(api): wire ReportsModule and PatientsModule into AppModule"
```

---

## Task 9: Web — API client

**Files:**
- Create: `apps/web/src/lib/api-client.ts`

- [ ] **Step 1: Create typed API client**

Create `apps/web/src/lib/api-client.ts`:

```typescript
import { auth } from './auth';

const API_URL = process.env.API_URL ?? 'http://localhost:3001';

async function getAuthHeader(): Promise<Record<string, string>> {
  const session = await auth();
  const token = (session as any)?.accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message ?? `API error ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const apiClient = {
  // Patients
  getPatients: (params?: { name?: string; rut?: string }) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return apiFetch<PatientListItem[]>(`/patients${qs}`);
  },
  getPatient: (id: string) => apiFetch<PatientDetail>(`/patients/${id}`),
  createPatient: (data: CreatePatientInput) =>
    apiFetch<PatientDetail>('/patients', { method: 'POST', body: JSON.stringify(data) }),
  updatePatient: (id: string, data: Partial<CreatePatientInput>) =>
    apiFetch<PatientDetail>(`/patients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  requestPatientAccess: (id: string, reason: string) =>
    apiFetch(`/patients/${id}/access-requests`, { method: 'POST', body: JSON.stringify({ reason }) }),

  // Reports
  getReports: () => apiFetch<ReportSummary[]>('/reports'),
  getReport: (id: string) => apiFetch<ReportDetail>(`/reports/${id}`),
  createReport: (data: CreateReportInput) =>
    apiFetch<{ id: string }>('/reports', { method: 'POST', body: JSON.stringify(data) }),
  updateReport: (id: string, data: Partial<UpdateReportInput>) =>
    apiFetch(`/reports/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  transitionReport: (id: string, action: string) =>
    apiFetch(`/reports/${id}/transition`, { method: 'POST', body: JSON.stringify({ action }) }),
  saveSection: (reportId: string, sectionType: string, content: string) =>
    apiFetch(`/reports/${reportId}/sections/${sectionType}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    }),
  approveSection: (reportId: string, sectionType: string) =>
    apiFetch(`/reports/${reportId}/sections/${sectionType}/approve`, { method: 'POST' }),
};

// ─── Local types (mirrors API responses) ──────────────────────────────────────

export interface PatientListItem {
  id: string;
  name: string;
  isAssigned: boolean;
  reportCount: number;
  birthDate?: string;
  gender?: string;
}

export interface PatientDetail {
  id: string;
  name: string;
  rut?: string;
  birthDate?: string;
  gender?: string;
  email?: string;
  phone?: string;
  isAssigned: boolean;
  reports: ReportSummary[];
}

export interface CreatePatientInput {
  name: string;
  rut?: string;
  birthDate?: string;
  gender?: string;
  email?: string;
  phone?: string;
}

export interface ReportSummary {
  id: string;
  status: string;
  frameworkCode: string;
  createdAt: string;
  updatedAt: string;
  patient?: { id: string; name: string };
  author?: { id: string; name: string };
}

export interface ReportDetail extends ReportSummary {
  supervisorId?: string;
  sections: SectionSummary[];
}

export interface SectionSummary {
  id: string;
  sectionType: string;
  status: string;
  generatedBy: string;
  content?: string;
}

export interface CreateReportInput {
  patientId: string;
  frameworkCode: string;
  selectedTests: string[];
  supervisorId?: string;
}

export interface UpdateReportInput {
  consultationReason?: string;
  omitCit?: boolean;
  selectedTests?: string[];
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/lib/api-client.ts
git commit -m "feat(web): add typed API client for patients and reports"
```

---

## Task 10: Web — Patients list page

**Files:**
- Create: `apps/web/src/app/(dashboard)/patients/page.tsx`
- Create: `apps/web/src/app/(dashboard)/patients/_components/patient-table.tsx`

- [ ] **Step 1: Create patient-table component**

Create `apps/web/src/app/(dashboard)/patients/_components/patient-table.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PatientListItem } from '@/lib/api-client';

interface Props {
  patients: PatientListItem[];
  onSearch: (params: { name?: string; rut?: string }) => void;
}

export function PatientTable({ patients, onSearch }: Props) {
  const [nameQuery, setNameQuery] = useState('');
  const [rutQuery, setRutQuery] = useState('');

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    onSearch({
      name: nameQuery || undefined,
      rut: rutQuery || undefined,
    });
  }

  return (
    <div>
      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={nameQuery}
          onChange={(e) => setNameQuery(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <input
          type="text"
          placeholder="RUT exacto (ej: 12.345.678-9)"
          value={rutQuery}
          onChange={(e) => setRutQuery(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          type="submit"
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700 transition"
        >
          Buscar
        </button>
      </form>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Nombre</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Informes</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Acceso</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {patients.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  No se encontraron pacientes
                </td>
              </tr>
            )}
            {patients.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-gray-600">{p.reportCount}</td>
                <td className="px-4 py-3">
                  {p.isAssigned ? (
                    <span className="inline-flex items-center gap-1 text-green-700 text-xs font-medium">
                      A cargo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-gray-400 text-xs">
                      Sin acceso
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {p.isAssigned ? (
                    <Link
                      href={`/patients/${p.id}`}
                      className="text-brand-600 hover:underline text-sm"
                    >
                      Ver
                    </Link>
                  ) : (
                    <Link
                      href={`/patients/${p.id}`}
                      className="text-gray-400 hover:text-brand-600 text-sm"
                    >
                      Solicitar acceso
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create patients list page**

Create `apps/web/src/app/(dashboard)/patients/page.tsx`:

```tsx
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { PatientTableWrapper } from './_components/patient-table-wrapper';

export default async function PatientsPage() {
  const patients = await apiClient.getPatients().catch(() => []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pacientes</h1>
        <Link
          href="/patients/new"
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700 transition"
        >
          Nuevo paciente
        </Link>
      </div>
      <PatientTableWrapper initialPatients={patients} />
    </div>
  );
}
```

The list uses client-side search — create `apps/web/src/app/(dashboard)/patients/_components/patient-table-wrapper.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { apiClient, PatientListItem } from '@/lib/api-client';
import { PatientTable } from './patient-table';

export function PatientTableWrapper({ initialPatients }: { initialPatients: PatientListItem[] }) {
  const [patients, setPatients] = useState(initialPatients);
  const [loading, setLoading] = useState(false);

  async function handleSearch(params: { name?: string; rut?: string }) {
    setLoading(true);
    try {
      const results = await apiClient.getPatients(params);
      setPatients(results);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {loading && <p className="text-sm text-gray-500 mb-2">Buscando...</p>}
      <PatientTable patients={patients} onSearch={handleSearch} />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/"(dashboard)"/patients/
git commit -m "feat(web): add patients list page with search"
```

---

## Task 11: Web — Patient form (create) + detail

**Files:**
- Create: `apps/web/src/app/(dashboard)/patients/new/page.tsx`
- Create: `apps/web/src/app/(dashboard)/patients/new/_components/patient-form.tsx`
- Create: `apps/web/src/app/(dashboard)/patients/[id]/page.tsx`
- Create: `apps/web/src/app/(dashboard)/patients/[id]/_components/patient-info.tsx`
- Create: `apps/web/src/app/(dashboard)/patients/[id]/_components/report-list.tsx`

- [ ] **Step 1: Create patient form component**

Create `apps/web/src/app/(dashboard)/patients/new/_components/patient-form.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

export function PatientForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(e.currentTarget);

    try {
      const patient = await apiClient.createPatient({
        name: form.get('name') as string,
        rut: (form.get('rut') as string) || undefined,
        birthDate: (form.get('birthDate') as string) || undefined,
        gender: (form.get('gender') as string) || undefined,
        email: (form.get('email') as string) || undefined,
        phone: (form.get('phone') as string) || undefined,
      });
      router.push(`/patients/${patient.id}`);
    } catch (err: any) {
      setError(err.message ?? 'Error al crear paciente');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
        <input name="name" required className="w-full border rounded-lg px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">RUT</label>
        <input name="rut" placeholder="12.345.678-9" className="w-full border rounded-lg px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento</label>
        <input name="birthDate" type="date" className="w-full border rounded-lg px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Género</label>
        <select name="gender" className="w-full border rounded-lg px-3 py-2 text-sm">
          <option value="">Sin especificar</option>
          <option value="M">Masculino</option>
          <option value="F">Femenino</option>
          <option value="NB">No binario</option>
          <option value="O">Otro</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input name="email" type="email" className="w-full border rounded-lg px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
        <input name="phone" className="w-full border rounded-lg px-3 py-2 text-sm" />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-brand-700 transition disabled:opacity-50"
      >
        {loading ? 'Guardando...' : 'Crear paciente'}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Create new patient page**

Create `apps/web/src/app/(dashboard)/patients/new/page.tsx`:

```tsx
import Link from 'next/link';
import { PatientForm } from './_components/patient-form';

export default function NewPatientPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/patients" className="text-gray-500 hover:text-gray-700 text-sm">
          ← Pacientes
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nuevo paciente</h1>
      </div>
      <PatientForm />
    </div>
  );
}
```

- [ ] **Step 3: Create patient detail components**

Create `apps/web/src/app/(dashboard)/patients/[id]/_components/patient-info.tsx`:

```tsx
interface Props {
  name: string;
  rut?: string;
  birthDate?: string;
  gender?: string;
  email?: string;
  phone?: string;
}

const GENDER_LABEL: Record<string, string> = { M: 'Masculino', F: 'Femenino', NB: 'No binario', O: 'Otro' };

export function PatientInfo({ name, rut, birthDate, gender, email, phone }: Props) {
  return (
    <div className="bg-white border rounded-lg p-6 mb-6">
      <h2 className="font-semibold text-lg mb-4">{name}</h2>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        {rut && (
          <>
            <dt className="text-gray-500">RUT</dt>
            <dd>{rut}</dd>
          </>
        )}
        {birthDate && (
          <>
            <dt className="text-gray-500">Fecha de nacimiento</dt>
            <dd>{new Date(birthDate).toLocaleDateString('es-CL')}</dd>
          </>
        )}
        {gender && (
          <>
            <dt className="text-gray-500">Género</dt>
            <dd>{GENDER_LABEL[gender] ?? gender}</dd>
          </>
        )}
        {email && (
          <>
            <dt className="text-gray-500">Email</dt>
            <dd>{email}</dd>
          </>
        )}
        {phone && (
          <>
            <dt className="text-gray-500">Teléfono</dt>
            <dd>{phone}</dd>
          </>
        )}
      </dl>
    </div>
  );
}
```

Create `apps/web/src/app/(dashboard)/patients/[id]/_components/report-list.tsx`:

```tsx
import Link from 'next/link';
import { ReportSummary } from '@/lib/api-client';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Borrador',
  IN_PROGRESS: 'En redacción',
  REVIEW: 'En revisión',
  SUPERVISOR_REVIEW: 'Revisión supervisora',
  APPROVED: 'Aprobado',
  EXPORTED: 'Exportado',
  FINAL: 'Final',
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  REVIEW: 'bg-yellow-100 text-yellow-700',
  SUPERVISOR_REVIEW: 'bg-orange-100 text-orange-700',
  APPROVED: 'bg-green-100 text-green-700',
  EXPORTED: 'bg-teal-100 text-teal-700',
  FINAL: 'bg-purple-100 text-purple-700',
};

export function ReportList({ reports, patientId }: { reports: ReportSummary[]; patientId: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Informes</h3>
        <Link
          href={`/reports/new?patientId=${patientId}`}
          className="bg-brand-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-brand-700 transition"
        >
          Nuevo informe
        </Link>
      </div>

      {reports.length === 0 ? (
        <p className="text-gray-500 text-sm">No hay informes para este paciente.</p>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <Link
              key={r.id}
              href={`/reports/${r.id}`}
              className="flex items-center justify-between border rounded-lg px-4 py-3 hover:bg-gray-50 transition"
            >
              <div className="text-sm">
                <span className="font-medium">{r.frameworkCode}</span>
                <span className="text-gray-500 ml-2">
                  {new Date(r.createdAt).toLocaleDateString('es-CL')}
                </span>
              </div>
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLOR[r.status] ?? 'bg-gray-100'}`}
              >
                {STATUS_LABEL[r.status] ?? r.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create patient detail page**

Create `apps/web/src/app/(dashboard)/patients/[id]/page.tsx`:

```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { PatientInfo } from './_components/patient-info';
import { ReportList } from './_components/report-list';
import { AccessRequestButton } from './_components/access-request-button';

export default async function PatientDetailPage({ params }: { params: { id: string } }) {
  let patient;
  let forbidden = false;

  try {
    patient = await apiClient.getPatient(params.id);
  } catch (err: any) {
    if (err.message?.includes('Sin acceso')) {
      forbidden = true;
    } else {
      notFound();
    }
  }

  if (forbidden) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-gray-600">No tienes acceso a este paciente.</p>
        <AccessRequestButton patientId={params.id} />
      </div>
    );
  }

  if (!patient) notFound();

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/patients" className="text-gray-500 hover:text-gray-700 text-sm">
          ← Pacientes
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{patient.name}</h1>
      </div>
      <PatientInfo
        name={patient.name}
        rut={patient.rut}
        birthDate={patient.birthDate}
        gender={patient.gender}
        email={patient.email}
        phone={patient.phone}
      />
      <ReportList reports={patient.reports} patientId={patient.id} />
    </div>
  );
}
```

- [ ] **Step 5: Create AccessRequestButton**

Create `apps/web/src/app/(dashboard)/patients/[id]/_components/access-request-button.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';

export function AccessRequestButton({ patientId }: { patientId: string }) {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.requestPatientAccess(patientId, reason);
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  if (sent) return <p className="text-green-600 text-sm">Solicitud enviada. Espera aprobación del administrador.</p>;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-sm">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motivo de la solicitud..."
        required
        className="border rounded-lg px-3 py-2 text-sm resize-none h-20"
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50"
      >
        {loading ? 'Enviando...' : 'Solicitar acceso'}
      </button>
    </form>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/"(dashboard)"/patients/
git commit -m "feat(web): add patient create form and patient detail page"
```

---

## Task 12: Web — Report wizard

**Files:**
- Create: `apps/web/src/app/(dashboard)/reports/new/page.tsx`
- Create: `apps/web/src/app/(dashboard)/reports/new/_components/step-framework.tsx`
- Create: `apps/web/src/app/(dashboard)/reports/new/_components/step-tests.tsx`
- Create: `apps/web/src/app/(dashboard)/reports/new/_components/step-confirm.tsx`
- Create: `apps/web/src/app/(dashboard)/reports/new/_components/report-wizard.tsx`

- [ ] **Step 1: Create step-framework component**

Create `apps/web/src/app/(dashboard)/reports/new/_components/step-framework.tsx`:

```tsx
'use client';

interface Props {
  selected: string;
  onSelect: (code: string) => void;
}

const FRAMEWORKS = [
  {
    code: 'SNP-CHC',
    name: 'SNP-CHC (Infanto-Juvenil)',
    description: 'Neurodesarrollo, hasta ~30 años. Organizado en 4 ejes jerárquicos.',
  },
  {
    code: 'STANDARD',
    name: 'Estándar por funciones (Adultos)',
    description: 'Lesión, neurocognitivo, psiquiátrico. Funciones planas.',
  },
];

export function StepFramework({ selected, onSelect }: Props) {
  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-gray-900 mb-4">Paso 1: Selecciona el marco clínico</h2>
      {FRAMEWORKS.map((f) => (
        <button
          key={f.code}
          type="button"
          onClick={() => onSelect(f.code)}
          className={`w-full text-left border rounded-lg p-4 transition ${
            selected === f.code ? 'border-brand-600 bg-brand-50' : 'hover:bg-gray-50'
          }`}
        >
          <p className="font-medium text-sm">{f.name}</p>
          <p className="text-xs text-gray-500 mt-1">{f.description}</p>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create step-tests component**

Create `apps/web/src/app/(dashboard)/reports/new/_components/step-tests.tsx`:

```tsx
'use client';

interface TestOption {
  code: string;
  name: string;
  domain?: string;
}

interface Props {
  framework: string;
  selected: string[];
  onToggle: (code: string) => void;
}

const TESTS_BY_FRAMEWORK: Record<string, TestOption[]> = {
  'SNP-CHC': [
    { code: 'WISC-V', name: 'WISC-V', domain: 'Inteligencia' },
    { code: 'TFCRO', name: 'TFCRO', domain: 'Visuoespacial' },
    { code: 'TAVECI', name: 'TAVECI', domain: 'Memoria episódica verbal' },
    { code: 'WCST', name: 'WCST', domain: 'Funciones ejecutivas' },
    { code: 'TMT', name: 'TMT', domain: 'Funciones ejecutivas' },
    { code: 'CARAS-R', name: 'CARAS-R', domain: 'Atención' },
    { code: 'ADOS-2', name: 'ADOS-2', domain: 'Cognición social' },
    { code: 'ADI-R', name: 'ADI-R', domain: 'Cognición social' },
    { code: 'BASC-3', name: 'BASC-3', domain: 'Cuestionarios' },
  ],
  STANDARD: [
    { code: 'WAIS-IV', name: 'WAIS-IV', domain: 'Inteligencia' },
    { code: 'TFCRO', name: 'TFCRO', domain: 'Visuoespacial' },
    { code: 'TAVEC', name: 'TAVEC', domain: 'Memoria' },
    { code: 'WCST', name: 'WCST', domain: 'Funciones ejecutivas' },
    { code: 'TMT', name: 'TMT', domain: 'Funciones ejecutivas' },
    { code: 'CARAS-R', name: 'CARAS-R', domain: 'Atención' },
    { code: 'ASRS-18', name: 'ASRS-18', domain: 'Cuestionarios' },
    { code: 'DEX-Sp', name: 'DEX-Sp', domain: 'Cuestionarios' },
    { code: 'BAI', name: 'BAI', domain: 'Cuestionarios' },
    { code: 'BDI-II', name: 'BDI-II', domain: 'Cuestionarios' },
  ],
};

export function StepTests({ framework, selected, onToggle }: Props) {
  const tests = TESTS_BY_FRAMEWORK[framework] ?? [];
  const byDomain = tests.reduce<Record<string, TestOption[]>>((acc, t) => {
    const d = t.domain ?? 'Otros';
    return { ...acc, [d]: [...(acc[d] ?? []), t] };
  }, {});

  return (
    <div>
      <h2 className="font-semibold text-gray-900 mb-4">Paso 2: Selecciona los tests aplicados</h2>
      {Object.entries(byDomain).map(([domain, items]) => (
        <div key={domain} className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{domain}</p>
          <div className="space-y-1">
            {items.map((t) => (
              <label key={t.code} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(t.code)}
                  onChange={() => onToggle(t.code)}
                  className="rounded border-gray-300 text-brand-600"
                />
                <span className="text-sm">{t.name}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create step-confirm component**

Create `apps/web/src/app/(dashboard)/reports/new/_components/step-confirm.tsx`:

```tsx
'use client';

interface User {
  id: string;
  name: string;
}

interface Props {
  framework: string;
  tests: string[];
  supervisorId: string;
  onSupervisorChange: (id: string) => void;
  supervisors: User[];
  loading: boolean;
  onConfirm: () => void;
  onBack: () => void;
}

export function StepConfirm({
  framework, tests, supervisorId, onSupervisorChange, supervisors, loading, onConfirm, onBack,
}: Props) {
  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-gray-900 mb-4">Paso 3: Confirmar y crear</h2>

      <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
        <p><span className="font-medium">Marco:</span> {framework}</p>
        <p><span className="font-medium">Tests:</span> {tests.length === 0 ? 'Ninguno' : tests.join(', ')}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Supervisor (opcional)
        </label>
        <select
          value={supervisorId}
          onChange={(e) => onSupervisorChange(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Sin supervisor</option>
          {supervisors.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onBack} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
          Atrás
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? 'Creando...' : 'Crear informe'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create wizard orchestrator and page**

Create `apps/web/src/app/(dashboard)/reports/new/_components/report-wizard.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { StepFramework } from './step-framework';
import { StepTests } from './step-tests';
import { StepConfirm } from './step-confirm';

interface User { id: string; name: string }

export function ReportWizard({ patientId, supervisors }: { patientId: string; supervisors: User[] }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [framework, setFramework] = useState('SNP-CHC');
  const [tests, setTests] = useState<string[]>([]);
  const [supervisorId, setSupervisorId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function toggleTest(code: string) {
    setTests((prev) => prev.includes(code) ? prev.filter((t) => t !== code) : [...prev, code]);
  }

  async function handleCreate() {
    setLoading(true);
    setError('');
    try {
      const report = await apiClient.createReport({
        patientId,
        frameworkCode: framework,
        selectedTests: tests,
        supervisorId: supervisorId || undefined,
      });
      router.push(`/reports/${report.id}`);
    } catch (err: any) {
      setError(err.message ?? 'Error al crear el informe');
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl">
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`flex-1 h-1 rounded-full ${s <= step ? 'bg-brand-600' : 'bg-gray-200'}`}
          />
        ))}
      </div>

      {step === 1 && (
        <>
          <StepFramework selected={framework} onSelect={setFramework} />
          <button
            onClick={() => setStep(2)}
            className="mt-6 bg-brand-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-brand-700"
          >
            Siguiente
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <StepTests framework={framework} selected={tests} onToggle={toggleTest} />
          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(1)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
              Atrás
            </button>
            <button onClick={() => setStep(3)} className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-brand-700">
              Siguiente
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <StepConfirm
          framework={framework}
          tests={tests}
          supervisorId={supervisorId}
          onSupervisorChange={setSupervisorId}
          supervisors={supervisors}
          loading={loading}
          onConfirm={handleCreate}
          onBack={() => setStep(2)}
        />
      )}
    </div>
  );
}
```

Create `apps/web/src/app/(dashboard)/reports/new/page.tsx`:

```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ReportWizard } from './_components/report-wizard';

// Supervisors list is fetched from the API. For now, we pass an empty list
// and the dropdown shows "Sin supervisor". Wire up the users endpoint in a later task.
export default async function NewReportPage({
  searchParams,
}: {
  searchParams: { patientId?: string };
}) {
  const patientId = searchParams.patientId;
  if (!patientId) notFound();

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/patients/${patientId}`} className="text-gray-500 hover:text-gray-700 text-sm">
          ← Paciente
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nuevo informe</h1>
      </div>
      <ReportWizard patientId={patientId} supervisors={[]} />
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/"(dashboard)"/reports/new/
git commit -m "feat(web): add report creation wizard (framework, tests, confirm)"
```

---

## Task 13: Web — Report detail overview

**Files:**
- Create: `apps/web/src/app/(dashboard)/reports/[id]/page.tsx`
- Create: `apps/web/src/app/(dashboard)/reports/[id]/_components/report-overview.tsx`
- Create: `apps/web/src/app/(dashboard)/reports/[id]/_components/section-list.tsx`
- Create: `apps/web/src/app/(dashboard)/reports/[id]/_components/transition-button.tsx`

- [ ] **Step 1: Create transition-button component**

Create `apps/web/src/app/(dashboard)/reports/[id]/_components/transition-button.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

interface Props {
  reportId: string;
  action: string;
  label: string;
}

export function TransitionButton({ reportId, action, label }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleClick() {
    setLoading(true);
    setError('');
    try {
      await apiClient.transitionReport(reportId, action);
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? 'Error al cambiar estado');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50"
      >
        {loading ? 'Procesando...' : label}
      </button>
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Create section-list component**

Create `apps/web/src/app/(dashboard)/reports/[id]/_components/section-list.tsx`:

```tsx
import { SectionSummary } from '@/lib/api-client';

const SECTION_LABEL: Record<string, string> = {
  IDENTIFICATION: 'Datos de identificación',
  CONSULTATION_REASON: 'Motivo de consulta',
  BACKGROUND: 'Antecedentes relevantes',
  PROCEDURE_TESTS: 'Procedimiento y pruebas',
  OBSERVED_BEHAVIOR: 'Conducta observada',
  QUESTIONNAIRE_SYMPTOMS: 'Sintomatología en cuestionarios',
  COGNITIVE_EVALUATION: 'Evaluación cognitiva',
  SOCIAL_COGNITION: 'Cognición social',
  RESULTS_SYNTHESIS: 'Síntesis de resultados',
  CONCLUSIONS: 'Conclusiones',
  RECOMMENDATIONS: 'Recomendaciones',
  ANNEXES: 'Anexos',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-600',
  AI_GENERATED: 'bg-blue-100 text-blue-700',
  CLINICIAN_REVIEWING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  AI_GENERATED: 'Generado por IA',
  CLINICIAN_REVIEWING: 'En revisión',
  APPROVED: 'Aprobado',
};

export function SectionList({ sections }: { sections: SectionSummary[] }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-700">Sección</th>
            <th className="text-left px-4 py-3 font-medium text-gray-700">Estado</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {sections.map((s) => (
            <tr key={s.sectionType} className="hover:bg-gray-50">
              <td className="px-4 py-3">{SECTION_LABEL[s.sectionType] ?? s.sectionType}</td>
              <td className="px-4 py-3">
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLOR[s.status] ?? 'bg-gray-100'}`}>
                  {STATUS_LABEL[s.status] ?? s.status}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <a href="#" className="text-brand-600 hover:underline text-xs">
                  Editar
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Create report-overview component**

Create `apps/web/src/app/(dashboard)/reports/[id]/_components/report-overview.tsx`:

```tsx
import { ReportDetail } from '@/lib/api-client';
import { SectionList } from './section-list';
import { TransitionButton } from './transition-button';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Borrador',
  IN_PROGRESS: 'En redacción',
  REVIEW: 'En revisión',
  SUPERVISOR_REVIEW: 'Revisión supervisora',
  APPROVED: 'Aprobado',
  EXPORTED: 'Exportado',
  FINAL: 'Final',
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  REVIEW: 'bg-yellow-100 text-yellow-700',
  SUPERVISOR_REVIEW: 'bg-orange-100 text-orange-700',
  APPROVED: 'bg-green-100 text-green-700',
  EXPORTED: 'bg-teal-100 text-teal-700',
  FINAL: 'bg-purple-100 text-purple-700',
};

interface ActionConfig { action: string; label: string }

function getAvailableActions(status: string): ActionConfig[] {
  const map: Record<string, ActionConfig[]> = {
    DRAFT: [{ action: 'start', label: 'Iniciar redacción' }],
    IN_PROGRESS: [{ action: 'submit', label: 'Enviar a revisión' }],
    REVIEW: [
      { action: 'submit', label: 'Enviar a revisión supervisora' },
      { action: 'approve', label: 'Aprobar' },
    ],
    SUPERVISOR_REVIEW: [{ action: 'approve', label: 'Aprobar' }],
    APPROVED: [{ action: 'export', label: 'Exportar' }],
    EXPORTED: [{ action: 'finalize', label: 'Finalizar' }],
  };
  return map[status] ?? [];
}

export function ReportOverview({ report }: { report: ReportDetail }) {
  const actions = getAvailableActions(report.status);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className={`text-sm font-medium px-3 py-1 rounded-full ${STATUS_COLOR[report.status] ?? 'bg-gray-100'}`}>
          {STATUS_LABEL[report.status] ?? report.status}
        </span>
        <span className="text-sm text-gray-500">{report.frameworkCode}</span>
      </div>

      {actions.length > 0 && (
        <div className="flex gap-3 mb-6">
          {actions.map((a) => (
            <TransitionButton key={a.action} reportId={report.id} action={a.action} label={a.label} />
          ))}
        </div>
      )}

      <SectionList sections={report.sections} />
    </div>
  );
}
```

- [ ] **Step 4: Create report detail page**

Create `apps/web/src/app/(dashboard)/reports/[id]/page.tsx`:

```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { ReportOverview } from './_components/report-overview';

export default async function ReportDetailPage({ params }: { params: { id: string } }) {
  let report;
  try {
    report = await apiClient.getReport(params.id);
  } catch {
    notFound();
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={report.patient ? `/patients/${report.patient.id}` : '/repository'}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          ← {report.patient?.name ?? 'Repositorio'}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Informe</h1>
      </div>
      <ReportOverview report={report} />
    </div>
  );
}
```

- [ ] **Step 5: Type-check web app**

```bash
cd apps/web && pnpm type-check
```

Expected: no type errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/"(dashboard)"/reports/
git commit -m "feat(web): add report detail page with state machine actions and section list"
```

---

## Self-Review Checklist

After completing all tasks, verify the following:

- [ ] `pnpm db:migrate` was run and migration succeeded
- [ ] `pnpm db:generate` regenerated the Prisma client
- [ ] `cd apps/api && pnpm test` — all tests pass
- [ ] `cd apps/api && pnpm type-check` — no errors
- [ ] `cd apps/web && pnpm type-check` — no errors
- [ ] `.env` has `RUT_HMAC_SECRET` and `ENCRYPTION_KEY` set (64-char hex for the key)
- [ ] Patient access request creates `AccessRequest` with `patientId` (not `reportId`)
- [ ] Report creation initializes ALL `SectionType` values as `PENDING`
- [ ] State machine tests cover all 8+ transition scenarios
