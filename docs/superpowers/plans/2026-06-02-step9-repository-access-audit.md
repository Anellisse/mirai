# Step 9 — Repositorio + Control de Acceso + Auditoría — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el repositorio de informes con enmascaramiento de nombres, el flujo de solicitud/aprobación de acceso, y el log de auditoría para administradores.

**Architecture:** Tres módulos NestJS nuevos (RepositoryModule, AccessControlModule, AuditModule) + endpoint `GET /auth/me` para exponer el rol al frontend. El frontend usa server components para cargar datos y client components para la interactividad (inline form de solicitud, modal de revisión). El enmascaramiento ocurre en el servidor.

**Tech Stack:** NestJS + Prisma (API), Next.js App Router + TypeScript + Tailwind (web), `@mirai/shared-types` para Role enum.

---

## File Map

| Acción | Archivo |
|---|---|
| Modificar | `apps/api/src/modules/auth/auth.controller.ts` |
| Crear | `apps/api/src/modules/repository/repository.service.ts` |
| Crear | `apps/api/src/modules/repository/repository.controller.ts` |
| Crear | `apps/api/src/modules/repository/repository.module.ts` |
| Crear | `apps/api/src/modules/repository/__tests__/repository.service.spec.ts` |
| Crear | `apps/api/src/modules/access-control/dto/create-access-request.dto.ts` |
| Crear | `apps/api/src/modules/access-control/dto/approve-access-request.dto.ts` |
| Crear | `apps/api/src/modules/access-control/dto/reject-access-request.dto.ts` |
| Crear | `apps/api/src/modules/access-control/access-control.service.ts` |
| Crear | `apps/api/src/modules/access-control/access-control.controller.ts` |
| Crear | `apps/api/src/modules/access-control/access-control.module.ts` |
| Crear | `apps/api/src/modules/access-control/__tests__/access-control.service.spec.ts` |
| Crear | `apps/api/src/modules/audit/audit.service.ts` |
| Crear | `apps/api/src/modules/audit/audit.controller.ts` |
| Crear | `apps/api/src/modules/audit/audit.module.ts` |
| Crear | `apps/api/src/modules/audit/__tests__/audit.service.spec.ts` |
| Modificar | `apps/api/src/app.module.ts` |
| Modificar | `apps/web/src/lib/api-client.ts` |
| Modificar | `apps/web/src/app/(dashboard)/layout.tsx` |
| Crear | `apps/web/src/app/(dashboard)/repository/page.tsx` |
| Crear | `apps/web/src/app/(dashboard)/repository/_components/repository-table.tsx` |
| Crear | `apps/web/src/app/(dashboard)/repository/_components/access-request-row.tsx` |
| Crear | `apps/web/src/app/(dashboard)/admin/access-requests/page.tsx` |
| Crear | `apps/web/src/app/(dashboard)/admin/access-requests/_components/access-requests-table.tsx` |
| Crear | `apps/web/src/app/(dashboard)/admin/access-requests/_components/review-modal.tsx` |
| Crear | `apps/web/src/app/(dashboard)/admin/audit-log/page.tsx` |

---

## Task 1: GET /auth/me + apiClient.getMe()

**Files:**
- Modify: `apps/api/src/modules/auth/auth.controller.ts`
- Modify: `apps/web/src/lib/api-client.ts`

- [ ] **Step 1: Agregar el endpoint GET /auth/me en auth.controller.ts**

Agregar `Get` a los imports de `@nestjs/common` y añadir el método al controlador:

```typescript
import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { Verify2faDto } from './dto/verify-2fa.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { Role, UserPayload } from '@mirai/shared-types';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from './guards/roles.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: UserPayload) {
    return {
      id: user.sub,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };
  }

  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @UseGuards(AuthGuard('local'))
  login(@Request() req: { user: any }) {
    return this.authService.login(req.user);
  }

  @Post('2fa/verify')
  verify2fa(@Body() dto: Verify2faDto) {
    return this.authService.verifyTwoFactor(dto.tempToken, dto.token);
  }

  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard)
  setup2fa(@CurrentUser() user: UserPayload) {
    return this.authService.setup2fa(user.sub);
  }

  @Post('2fa/confirm')
  @UseGuards(JwtAuthGuard)
  confirm2fa(@CurrentUser() user: UserPayload, @Body() dto: { token: string }) {
    return this.authService.confirm2fa(user.sub, dto.token);
  }
}
```

- [ ] **Step 2: Agregar getMe + interfaces en api-client.ts**

Al final de `apps/web/src/lib/api-client.ts`, después de `FinalReportData`, agregar:

```typescript
export interface CurrentUserData {
  id: string;
  email: string;
  role: string;
  organizationId: string;
}

export interface RepositoryReportItem {
  id: string;
  status: string;
  frameworkCode: string;
  createdAt: string;
  author: { name: string; title: string | null };
  patientName: string;
  isOwn: boolean;
  hasAccess: boolean;
  pendingRequest: boolean;
}

export interface AccessRequestItem {
  id: string;
  status: string;
  reason: string;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  requester: { name: string; email: string };
  reviewedBy: { name: string } | null;
  report: { patient: { name: string } } | null;
  grant: { expiresAt: string | null } | null;
}

export interface AuditLogItem {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: { name: string; email: string } | null;
}
```

Y dentro del objeto `apiClient`, después de `generateObservation`, agregar:

```typescript
  // Auth — current user
  getMe: () => apiFetch<CurrentUserData>('/auth/me'),

  // Repository
  getRepositoryReports: () => apiFetch<RepositoryReportItem[]>('/repository/reports'),

  // Access Control
  createAccessRequest: (reportId: string, reason: string) =>
    apiFetch(`/reports/${reportId}/access-requests`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  getAccessRequests: () => apiFetch<AccessRequestItem[]>('/access-requests'),
  approveAccessRequest: (requestId: string, duration: 'permanent' | '24h' | '48h') =>
    apiFetch(`/access-requests/${requestId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ duration }),
    }),
  rejectAccessRequest: (requestId: string, reason: string) =>
    apiFetch(`/access-requests/${requestId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // Audit
  getAuditLogs: (page = 1) =>
    apiFetch<{ data: AuditLogItem[]; total: number; page: number }>(`/audit-logs?page=${page}`),
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/auth/auth.controller.ts apps/web/src/lib/api-client.ts
git commit -m "feat(api+web): add GET /auth/me and repository/access-control/audit apiClient methods"
```

---

## Task 2: RepositoryModule (TDD)

**Files:**
- Create: `apps/api/src/modules/repository/__tests__/repository.service.spec.ts`
- Create: `apps/api/src/modules/repository/repository.service.ts`
- Create: `apps/api/src/modules/repository/repository.controller.ts`
- Create: `apps/api/src/modules/repository/repository.module.ts`

- [ ] **Step 1: Escribir los tests**

Crear `apps/api/src/modules/repository/__tests__/repository.service.spec.ts`:

```typescript
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
```

- [ ] **Step 2: Correr el test para verificar que falla**

```bash
cd apps/api && pnpm test -- --testPathPattern="repository.service" --no-coverage
```

Expected: FAIL con "Cannot find module '../repository.service'"

- [ ] **Step 3: Implementar repository.service.ts**

Crear `apps/api/src/modules/repository/repository.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { AccessRequestStatus } from '@prisma/client';
import { PrismaService } from '../../prisma.service';

function maskName(name: string): string {
  return name
    .split(' ')
    .map((word) => (word.length > 0 ? word[0] + '*'.repeat(word.length - 1) : ''))
    .join(' ');
}

@Injectable()
export class RepositoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, organizationId: string) {
    const reports = await this.prisma.report.findMany({
      where: { organizationId, deletedAt: null },
      include: {
        patient: { select: { name: true } },
        author: { select: { name: true, title: true } },
        accessGrants: {
          where: {
            userId,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
        },
        accessRequests: {
          where: { requesterId: userId, status: AccessRequestStatus.PENDING },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reports.map((r) => {
      const isOwn = r.authorId === userId;
      const hasAccess = isOwn || r.accessGrants.length > 0;
      const pendingRequest = r.accessRequests.length > 0;
      return {
        id: r.id,
        status: r.status,
        frameworkCode: r.frameworkCode,
        createdAt: r.createdAt,
        author: r.author,
        isOwn,
        hasAccess,
        pendingRequest,
        patientName: hasAccess ? r.patient.name : maskName(r.patient.name),
      };
    });
  }
}
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

```bash
cd apps/api && pnpm test -- --testPathPattern="repository.service" --no-coverage
```

Expected: 6 tests PASS.

- [ ] **Step 5: Crear repository.controller.ts**

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserPayload } from '@mirai/shared-types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RepositoryService } from './repository.service';

@Controller('repository')
@UseGuards(JwtAuthGuard)
export class RepositoryController {
  constructor(private readonly service: RepositoryService) {}

  @Get('reports')
  findAll(@CurrentUser() user: UserPayload) {
    return this.service.findAll(user.sub, user.organizationId);
  }
}
```

- [ ] **Step 6: Crear repository.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { RepositoryController } from './repository.controller';
import { RepositoryService } from './repository.service';

@Module({
  controllers: [RepositoryController],
  providers: [RepositoryService, PrismaService],
})
export class RepositoryModule {}
```

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/repository/
git commit -m "feat(api): RepositoryModule with name masking"
```

---

## Task 3: AccessControlModule (TDD)

**Files:**
- Create: `apps/api/src/modules/access-control/dto/create-access-request.dto.ts`
- Create: `apps/api/src/modules/access-control/dto/approve-access-request.dto.ts`
- Create: `apps/api/src/modules/access-control/dto/reject-access-request.dto.ts`
- Create: `apps/api/src/modules/access-control/__tests__/access-control.service.spec.ts`
- Create: `apps/api/src/modules/access-control/access-control.service.ts`
- Create: `apps/api/src/modules/access-control/access-control.controller.ts`
- Create: `apps/api/src/modules/access-control/access-control.module.ts`

- [ ] **Step 1: Crear los DTOs**

`apps/api/src/modules/access-control/dto/create-access-request.dto.ts`:
```typescript
import { IsString, MinLength } from 'class-validator';

export class CreateAccessRequestDto {
  @IsString()
  @MinLength(10, { message: 'El motivo debe tener al menos 10 caracteres' })
  reason!: string;
}
```

`apps/api/src/modules/access-control/dto/approve-access-request.dto.ts`:
```typescript
import { IsIn } from 'class-validator';

export class ApproveAccessRequestDto {
  @IsIn(['permanent', '24h', '48h'])
  duration!: 'permanent' | '24h' | '48h';
}
```

`apps/api/src/modules/access-control/dto/reject-access-request.dto.ts`:
```typescript
import { IsString, MinLength } from 'class-validator';

export class RejectAccessRequestDto {
  @IsString()
  @MinLength(5, { message: 'El motivo de rechazo es obligatorio' })
  reason!: string;
}
```

- [ ] **Step 2: Escribir los tests**

Crear `apps/api/src/modules/access-control/__tests__/access-control.service.spec.ts`:

```typescript
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
      const txArgs = (prisma.$transaction as jest.Mock).mock.calls[0][0];
      const grantCall = txArgs.find((p: any) => p === prisma.accessGrant.create.mock.results[0]?.value || true);
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
```

- [ ] **Step 3: Correr el test para verificar que falla**

```bash
cd apps/api && pnpm test -- --testPathPattern="access-control.service" --no-coverage
```

Expected: FAIL con "Cannot find module"

- [ ] **Step 4: Implementar access-control.service.ts**

Crear `apps/api/src/modules/access-control/access-control.service.ts`:

```typescript
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccessRequestStatus } from '@prisma/client';
import { Role, UserPayload } from '@mirai/shared-types';
import { PrismaService } from '../../prisma.service';

const ADMIN_ROLES: Role[] = [Role.ADMIN, Role.SUPER_ADMIN];

@Injectable()
export class AccessControlService {
  constructor(private readonly prisma: PrismaService) {}

  async createRequest(reportId: string, reason: string, user: UserPayload) {
    const report = await this.prisma.report.findFirst({
      where: { id: reportId, organizationId: user.organizationId, deletedAt: null },
    });
    if (!report) throw new NotFoundException('Informe no encontrado');
    if (report.authorId === user.sub) {
      throw new BadRequestException('No puedes solicitar acceso a tu propio informe');
    }

    const existing = await this.prisma.accessRequest.findFirst({
      where: { reportId, requesterId: user.sub, status: AccessRequestStatus.PENDING },
    });
    if (existing) throw new ConflictException('Ya tienes una solicitud pendiente para este informe');

    const request = await this.prisma.accessRequest.create({
      data: { reportId, requesterId: user.sub, reason },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.sub,
        action: 'ACCESS_REQUESTED',
        resource: 'AccessRequest',
        resourceId: request.id,
        metadata: { reportId },
      },
    });

    return request;
  }

  async findAll(user: UserPayload) {
    const isAdmin = ADMIN_ROLES.includes(user.role as Role);
    const where = isAdmin
      ? { report: { organizationId: user.organizationId } }
      : { requesterId: user.sub };

    return this.prisma.accessRequest.findMany({
      where,
      include: {
        requester: { select: { name: true, email: true } },
        reviewedBy: { select: { name: true } },
        report: { select: { patient: { select: { name: true } } } },
        grant: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approve(requestId: string, duration: 'permanent' | '24h' | '48h', user: UserPayload) {
    if (!ADMIN_ROLES.includes(user.role as Role)) {
      throw new ForbiddenException('Solo administradores pueden aprobar solicitudes');
    }

    const request = await this.prisma.accessRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Solicitud no encontrada');
    if (request.status !== AccessRequestStatus.PENDING) {
      throw new ConflictException('La solicitud ya fue procesada');
    }

    const expiresAt =
      duration === 'permanent'
        ? null
        : duration === '24h'
          ? new Date(Date.now() + 24 * 60 * 60 * 1000)
          : new Date(Date.now() + 48 * 60 * 60 * 1000);

    await this.prisma.$transaction([
      this.prisma.accessRequest.update({
        where: { id: requestId },
        data: { status: AccessRequestStatus.APPROVED, reviewedById: user.sub, reviewedAt: new Date() },
      }),
      this.prisma.accessGrant.create({
        data: {
          requestId,
          userId: request.requesterId,
          reportId: request.reportId,
          patientId: request.patientId,
          grantedById: user.sub,
          expiresAt,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: user.sub,
          action: 'ACCESS_GRANTED',
          resource: 'AccessRequest',
          resourceId: requestId,
          metadata: { duration, reportId: request.reportId },
        },
      }),
    ]);
  }

  async reject(requestId: string, reason: string, user: UserPayload) {
    if (!ADMIN_ROLES.includes(user.role as Role)) {
      throw new ForbiddenException('Solo administradores pueden rechazar solicitudes');
    }

    const request = await this.prisma.accessRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Solicitud no encontrada');
    if (request.status !== AccessRequestStatus.PENDING) {
      throw new ConflictException('La solicitud ya fue procesada');
    }

    await this.prisma.$transaction([
      this.prisma.accessRequest.update({
        where: { id: requestId },
        data: {
          status: AccessRequestStatus.REJECTED,
          reviewedById: user.sub,
          reviewedAt: new Date(),
          rejectionReason: reason,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: user.sub,
          action: 'ACCESS_REJECTED',
          resource: 'AccessRequest',
          resourceId: requestId,
          metadata: { reason, reportId: request.reportId },
        },
      }),
    ]);
  }
}
```

- [ ] **Step 5: Correr tests y verificar que pasan**

```bash
cd apps/api && pnpm test -- --testPathPattern="access-control.service" --no-coverage
```

Expected: 10 tests PASS.

- [ ] **Step 6: Crear access-control.controller.ts**

```typescript
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserPayload } from '@mirai/shared-types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccessControlService } from './access-control.service';
import { ApproveAccessRequestDto } from './dto/approve-access-request.dto';
import { CreateAccessRequestDto } from './dto/create-access-request.dto';
import { RejectAccessRequestDto } from './dto/reject-access-request.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class AccessControlController {
  constructor(private readonly service: AccessControlService) {}

  @Post('reports/:id/access-requests')
  create(
    @Param('id') reportId: string,
    @Body() dto: CreateAccessRequestDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.service.createRequest(reportId, dto.reason, user);
  }

  @Get('access-requests')
  findAll(@CurrentUser() user: UserPayload) {
    return this.service.findAll(user);
  }

  @Post('access-requests/:id/approve')
  approve(
    @Param('id') requestId: string,
    @Body() dto: ApproveAccessRequestDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.service.approve(requestId, dto.duration, user);
  }

  @Post('access-requests/:id/reject')
  reject(
    @Param('id') requestId: string,
    @Body() dto: RejectAccessRequestDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.service.reject(requestId, dto.reason, user);
  }
}
```

- [ ] **Step 7: Crear access-control.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AccessControlController } from './access-control.controller';
import { AccessControlService } from './access-control.service';

@Module({
  controllers: [AccessControlController],
  providers: [AccessControlService, PrismaService],
})
export class AccessControlModule {}
```

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/access-control/
git commit -m "feat(api): AccessControlModule with request/approve/reject flow"
```

---

## Task 4: AuditModule (TDD)

**Files:**
- Create: `apps/api/src/modules/audit/__tests__/audit.service.spec.ts`
- Create: `apps/api/src/modules/audit/audit.service.ts`
- Create: `apps/api/src/modules/audit/audit.controller.ts`
- Create: `apps/api/src/modules/audit/audit.module.ts`

- [ ] **Step 1: Escribir los tests**

Crear `apps/api/src/modules/audit/__tests__/audit.service.spec.ts`:

```typescript
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
```

- [ ] **Step 2: Correr el test para verificar que falla**

```bash
cd apps/api && pnpm test -- --testPathPattern="audit.service" --no-coverage
```

Expected: FAIL con "Cannot find module"

- [ ] **Step 3: Implementar audit.service.ts**

Crear `apps/api/src/modules/audit/audit.service.ts`:

```typescript
import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role, UserPayload } from '@mirai/shared-types';
import { PrismaService } from '../../prisma.service';

const ADMIN_ROLES: Role[] = [Role.ADMIN, Role.SUPER_ADMIN];
const PAGE_SIZE = 50;

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: UserPayload, page: number) {
    if (!ADMIN_ROLES.includes(user.role as Role)) {
      throw new ForbiddenException('Solo administradores pueden ver el log de auditoría');
    }

    const skip = (page - 1) * PAGE_SIZE;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { user: { organizationId: user.organizationId } },
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: PAGE_SIZE,
      }),
      this.prisma.auditLog.count({
        where: { user: { organizationId: user.organizationId } },
      }),
    ]);

    return { data, total, page };
  }
}
```

- [ ] **Step 4: Correr tests y verificar que pasan**

```bash
cd apps/api && pnpm test -- --testPathPattern="audit.service" --no-coverage
```

Expected: 3 tests PASS.

- [ ] **Step 5: Crear audit.controller.ts**

```typescript
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserPayload } from '@mirai/shared-types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditService } from './audit.service';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get()
  findAll(@CurrentUser() user: UserPayload, @Query('page') page?: string) {
    return this.service.findAll(user, page ? parseInt(page, 10) : 1);
  }
}
```

- [ ] **Step 6: Crear audit.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

@Module({
  controllers: [AuditController],
  providers: [AuditService, PrismaService],
})
export class AuditModule {}
```

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/audit/
git commit -m "feat(api): AuditModule with paginated log for admins"
```

---

## Task 5: Registrar módulos + verificar todos los tests

**Files:**
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Actualizar app.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { EncryptionModule } from './modules/encryption/encryption.module';
import { PatientsModule } from './modules/patients/patients.module';
import { ReportsModule } from './modules/reports/reports.module';
import { InterviewModule } from './modules/interview/interview.module';
import { ObservationModule } from './modules/observation/observation.module';
import { ConclusionModule } from './modules/conclusion/conclusion.module';
import { DiagnosticCodesModule } from './modules/diagnostic-codes/diagnostic-codes.module';
import { DescriptorScalesModule } from './modules/descriptor-scales/descriptor-scales.module';
import { TestScoreSlotsModule } from './modules/test-score-slots/test-score-slots.module';
import { NormativeTablesModule } from './modules/normative-tables/normative-tables.module';
import { RulesEngineModule } from './modules/rules-engine/rules-engine.module';
import { EvaluationModule } from './modules/evaluation/evaluation.module';
import { ScorePdfsModule } from './modules/score-pdfs/score-pdfs.module';
import { AnnexTablesModule } from './modules/annex-tables/annex-tables.module';
import { AiModule } from './modules/ai/ai.module';
import { ExportModule } from './modules/export/export.module';
import { FinalizeModule } from './modules/finalize/finalize.module';
import { RepositoryModule } from './modules/repository/repository.module';
import { AccessControlModule } from './modules/access-control/access-control.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EncryptionModule,
    AuthModule,
    PatientsModule,
    ReportsModule,
    InterviewModule,
    ObservationModule,
    ConclusionModule,
    DiagnosticCodesModule,
    DescriptorScalesModule,
    TestScoreSlotsModule,
    NormativeTablesModule,
    RulesEngineModule,
    EvaluationModule,
    ScorePdfsModule,
    AnnexTablesModule,
    AiModule,
    ExportModule,
    FinalizeModule,
    RepositoryModule,
    AccessControlModule,
    AuditModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 2: Correr todos los tests del API**

```bash
cd apps/api && pnpm test
```

Expected: todos los tests pasan. El número total debe ser ≥ 175 (156 anteriores + 6 repository + 10 access-control + 3 audit).

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/app.module.ts
git commit -m "feat(api): register RepositoryModule, AccessControlModule, AuditModule"
```

---

## Task 6: Layout con sidebar de admin

**Files:**
- Modify: `apps/web/src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Actualizar el layout**

Reemplazar el contenido completo de `apps/web/src/app/(dashboard)/layout.tsx`:

```typescript
import { requireAuth } from '@/lib/session';
import { apiClient } from '@/lib/api-client';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth();
  const me = await apiClient.getMe().catch(() => null);
  const isAdmin = me?.role === 'ADMIN' || me?.role === 'SUPER_ADMIN';

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-brand-900 text-white flex flex-col">
        <div className="p-6 border-b border-brand-600">
          <h2 className="font-bold text-lg">Mirai</h2>
          <p className="text-brand-50 text-xs mt-1">Centro Neuropsia</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <a href="/dashboard" className="block px-3 py-2 rounded-lg text-sm hover:bg-brand-500 transition">
            Inicio
          </a>
          <a href="/patients" className="block px-3 py-2 rounded-lg text-sm hover:bg-brand-500 transition">
            Pacientes
          </a>
          <a href="/repository" className="block px-3 py-2 rounded-lg text-sm hover:bg-brand-500 transition">
            Repositorio
          </a>
          {isAdmin && (
            <>
              <p className="text-brand-300 text-xs font-semibold uppercase tracking-wider px-3 pt-4 pb-1">
                Admin
              </p>
              <a
                href="/admin/access-requests"
                className="block px-3 py-2 rounded-lg text-sm hover:bg-brand-500 transition"
              >
                Solicitudes de acceso
              </a>
              <a
                href="/admin/audit-log"
                className="block px-3 py-2 rounded-lg text-sm hover:bg-brand-500 transition"
              >
                Log de auditoría
              </a>
            </>
          )}
        </nav>
        <div className="p-4 border-t border-brand-600 text-xs text-brand-200">
          {session.user?.email}
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/src/app/(dashboard)/layout.tsx"
git commit -m "feat(web): add admin sidebar section conditioned on user role"
```

---

## Task 7: Página /repository

**Files:**
- Create: `apps/web/src/app/(dashboard)/repository/page.tsx`
- Create: `apps/web/src/app/(dashboard)/repository/_components/repository-table.tsx`
- Create: `apps/web/src/app/(dashboard)/repository/_components/access-request-row.tsx`

- [ ] **Step 1: Crear access-request-row.tsx**

```typescript
'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';

interface Props {
  reportId: string;
  patientName: string;
  onSent: () => void;
}

export function AccessRequestRow({ reportId, patientName, onSent }: Props) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await apiClient.createAccessRequest(reportId, reason);
      onSent();
    } catch (err: any) {
      setError(err.message ?? 'Error al enviar solicitud');
    } finally {
      setLoading(false);
    }
  }

  return (
    <tr>
      <td colSpan={5} className="px-4 py-3 bg-purple-50 border-b border-purple-100">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 max-w-lg">
          <p className="text-xs font-medium text-purple-800">
            Solicitar acceso — <span className="italic">{patientName}</span>
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo clínico de la solicitud (mínimo 10 caracteres)..."
            required
            minLength={10}
            rows={2}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || reason.length < 10}
              className="bg-brand-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar solicitud'}
            </button>
          </div>
        </form>
      </td>
    </tr>
  );
}
```

- [ ] **Step 2: Crear repository-table.tsx**

```typescript
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { RepositoryReportItem } from '@/lib/api-client';
import { AccessRequestRow } from './access-request-row';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Borrador', IN_PROGRESS: 'En redacción', REVIEW: 'En revisión',
  SUPERVISOR_REVIEW: 'Rev. supervisora', APPROVED: 'Aprobado',
  EXPORTED: 'Exportado', FINAL: 'Final',
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700', IN_PROGRESS: 'bg-blue-100 text-blue-700',
  REVIEW: 'bg-yellow-100 text-yellow-700', SUPERVISOR_REVIEW: 'bg-orange-100 text-orange-700',
  APPROVED: 'bg-green-100 text-green-700', EXPORTED: 'bg-teal-100 text-teal-700',
  FINAL: 'bg-purple-100 text-purple-700',
};

interface Props {
  reports: RepositoryReportItem[];
}

export function RepositoryTable({ reports }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  function handleSent(reportId: string) {
    setSentIds((prev) => new Set([...prev, reportId]));
    setExpandedId(null);
  }

  if (reports.length === 0) {
    return <p className="text-gray-500 text-sm mt-4">No hay informes en el repositorio.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
          <tr>
            <th className="px-4 py-3 text-left">Paciente</th>
            <th className="px-4 py-3 text-left">Profesional</th>
            <th className="px-4 py-3 text-left">Estado</th>
            <th className="px-4 py-3 text-left">Fecha</th>
            <th className="px-4 py-3 text-left">Acción</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {reports.map((r) => (
            <>
              <tr
                key={r.id}
                className={r.isOwn ? 'bg-green-50' : r.hasAccess ? 'bg-purple-50' : 'bg-white'}
              >
                <td className="px-4 py-3 font-medium text-gray-900">
                  {r.patientName}
                </td>
                <td className="px-4 py-3 text-gray-600">{r.author.name}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[r.status] ?? 'bg-gray-100'}`}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(r.createdAt).toLocaleDateString('es-CL')}
                </td>
                <td className="px-4 py-3">
                  {(r.isOwn || r.hasAccess) ? (
                    <Link
                      href={`/reports/${r.id}`}
                      className="text-brand-600 hover:text-brand-800 font-medium text-sm"
                    >
                      Abrir →
                    </Link>
                  ) : sentIds.has(r.id) || r.pendingRequest ? (
                    <span className="text-xs text-gray-400 italic">Solicitud enviada</span>
                  ) : (
                    <button
                      onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                      className="text-brand-600 hover:text-brand-800 text-sm font-medium"
                    >
                      🔒 Pedir
                    </button>
                  )}
                </td>
              </tr>
              {expandedId === r.id && (
                <AccessRequestRow
                  key={`form-${r.id}`}
                  reportId={r.id}
                  patientName={r.patientName}
                  onSent={() => handleSent(r.id)}
                />
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Crear repository/page.tsx**

```typescript
import { apiClient } from '@/lib/api-client';
import { RepositoryTable } from './_components/repository-table';

export default async function RepositoryPage() {
  const reports = await apiClient.getRepositoryReports().catch(() => []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Repositorio</h1>
        <p className="text-sm text-gray-500 mt-1">
          Todos los informes de la organización. Los ajenos requieren solicitar acceso.
        </p>
      </div>
      <RepositoryTable reports={reports} />
    </div>
  );
}
```

- [ ] **Step 4: Verificar TypeScript**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/src/app/(dashboard)/repository/"
git commit -m "feat(web): repository page with masked names and inline access request"
```

---

## Task 8: Página /admin/access-requests

**Files:**
- Create: `apps/web/src/app/(dashboard)/admin/access-requests/_components/review-modal.tsx`
- Create: `apps/web/src/app/(dashboard)/admin/access-requests/_components/access-requests-table.tsx`
- Create: `apps/web/src/app/(dashboard)/admin/access-requests/page.tsx`

- [ ] **Step 1: Crear review-modal.tsx**

```typescript
'use client';

import { useState } from 'react';
import { AccessRequestItem, apiClient } from '@/lib/api-client';

interface Props {
  request: AccessRequestItem;
  onClose: () => void;
  onUpdated: () => void;
}

export function ReviewModal({ request, onClose, onUpdated }: Props) {
  const [duration, setDuration] = useState<'permanent' | '24h' | '48h'>('permanent');
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleApprove() {
    setLoading(true);
    setError('');
    try {
      await apiClient.approveAccessRequest(request.id, duration);
      onUpdated();
    } catch (err: any) {
      setError(err.message ?? 'Error al aprobar');
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) { setError('El motivo de rechazo es obligatorio'); return; }
    setLoading(true);
    setError('');
    try {
      await apiClient.rejectAccessRequest(request.id, rejectReason);
      onUpdated();
    } catch (err: any) {
      setError(err.message ?? 'Error al rechazar');
    } finally {
      setLoading(false);
    }
  }

  const patientName = request.report?.patient?.name ?? '—';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Revisar solicitud de acceso</h2>
        <p className="text-sm text-gray-500 mb-4">
          <strong>{request.requester.name}</strong> solicita acceso a{' '}
          <em className="text-gray-700">{patientName}</em>
        </p>

        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 mb-4">
          <p className="text-xs text-gray-500 mb-1 font-medium">Motivo:</p>
          {request.reason}
        </div>

        {!showReject ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duración del acceso</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value as any)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                <option value="permanent">Permanente</option>
                <option value="24h">24 horas</option>
                <option value="48h">48 horas</option>
              </select>
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Procesando...' : '✓ Aprobar'}
              </button>
              <button
                onClick={() => setShowReject(true)}
                disabled={loading}
                className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50"
              >
                ✗ Rechazar
              </button>
            </div>
            <button onClick={onClose} className="w-full text-sm text-gray-500 hover:text-gray-700">
              Cancelar
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Motivo del rechazo</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Explica por qué se rechaza la solicitud..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
            />
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={handleReject}
                disabled={loading || !rejectReason.trim()}
                className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50"
              >
                {loading ? 'Rechazando...' : 'Confirmar rechazo'}
              </button>
              <button
                onClick={() => setShowReject(false)}
                className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                Volver
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Crear access-requests-table.tsx**

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AccessRequestItem } from '@/lib/api-client';
import { ReviewModal } from './review-modal';

interface Props {
  requests: AccessRequestItem[];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return 'hace menos de 1h';
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
}

export function AccessRequestsTable({ requests }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<'pending' | 'resolved'>('pending');
  const [selected, setSelected] = useState<AccessRequestItem | null>(null);

  const pending = requests.filter((r) => r.status === 'PENDING');
  const resolved = requests.filter((r) => r.status !== 'PENDING');
  const shown = tab === 'pending' ? pending : resolved;

  function handleUpdated() {
    setSelected(null);
    router.refresh();
  }

  return (
    <>
      {selected && (
        <ReviewModal
          request={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
        />
      )}

      <div className="flex gap-3 mb-4">
        <button
          onClick={() => setTab('pending')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
            tab === 'pending'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Pendientes ({pending.length})
        </button>
        <button
          onClick={() => setTab('resolved')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
            tab === 'resolved'
              ? 'bg-gray-200 text-gray-800'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Resueltas ({resolved.length})
        </button>
      </div>

      {shown.length === 0 ? (
        <p className="text-gray-500 text-sm">No hay solicitudes {tab === 'pending' ? 'pendientes' : 'resueltas'}.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Solicitante</th>
                <th className="px-4 py-3 text-left">Informe</th>
                <th className="px-4 py-3 text-left">Hace</th>
                {tab === 'resolved' && <th className="px-4 py-3 text-left">Estado</th>}
                <th className="px-4 py-3 text-left"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {shown.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.requester.name}</td>
                  <td className="px-4 py-3 text-gray-500 italic text-xs">
                    {r.report?.patient?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{timeAgo(r.createdAt)}</td>
                  {tab === 'resolved' && (
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        r.status === 'APPROVED'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {r.status === 'APPROVED' ? 'Aprobada' : 'Rechazada'}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    {r.status === 'PENDING' && (
                      <button
                        onClick={() => setSelected(r)}
                        className="text-brand-600 hover:text-brand-800 text-sm font-medium"
                      >
                        Revisar →
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 3: Crear admin/access-requests/page.tsx**

```typescript
import { redirect } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { AccessRequestsTable } from './_components/access-requests-table';

export default async function AccessRequestsPage() {
  const me = await apiClient.getMe().catch(() => null);
  if (!me || !['ADMIN', 'SUPER_ADMIN'].includes(me.role)) {
    redirect('/dashboard');
  }

  const requests = await apiClient.getAccessRequests().catch(() => []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Solicitudes de acceso</h1>
      <AccessRequestsTable requests={requests} />
    </div>
  );
}
```

- [ ] **Step 4: Verificar TypeScript**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/src/app/(dashboard)/admin/access-requests/"
git commit -m "feat(web): admin access-requests page with review modal"
```

---

## Task 9: Página /admin/audit-log

**Files:**
- Create: `apps/web/src/app/(dashboard)/admin/audit-log/page.tsx`

- [ ] **Step 1: Crear admin/audit-log/page.tsx**

```typescript
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

const ACTION_LABEL: Record<string, string> = {
  ACCESS_REQUESTED: 'Acceso solicitado',
  ACCESS_GRANTED: 'Acceso concedido',
  ACCESS_REJECTED: 'Acceso rechazado',
  REPORT_FINALIZED: 'Informe finalizado',
};

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const me = await apiClient.getMe().catch(() => null);
  if (!me || !['ADMIN', 'SUPER_ADMIN'].includes(me.role)) {
    redirect('/dashboard');
  }

  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10));
  const { data, total } = await apiClient
    .getAuditLogs(page)
    .catch(() => ({ data: [], total: 0, page: 1 }));

  const totalPages = Math.ceil(total / 50);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Log de auditoría</h1>

      {data.length === 0 ? (
        <p className="text-gray-500 text-sm">No hay registros de auditoría.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Usuario</th>
                <th className="px-4 py-3 text-left">Acción</th>
                <th className="px-4 py-3 text-left">Recurso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('es-CL')}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {log.user?.name ?? <span className="text-gray-400 italic">Sistema</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-gray-800">
                      {ACTION_LABEL[log.action] ?? log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {log.resource}
                    {log.resourceId && ` · ${log.resourceId.slice(0, 8)}…`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center gap-4 mt-4 text-sm text-gray-600">
          {page > 1 && (
            <Link href={`?page=${page - 1}`} className="text-brand-600 hover:text-brand-800">
              ← Anterior
            </Link>
          )}
          <span>Página {page} de {totalPages}</span>
          {page < totalPages && (
            <Link href={`?page=${page + 1}`} className="text-brand-600 hover:text-brand-800">
              Siguiente →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 3: Correr todos los tests del API**

```bash
cd apps/api && pnpm test
```

Expected: todos los tests pasan.

- [ ] **Step 4: Commit final**

```bash
git add "apps/web/src/app/(dashboard)/admin/audit-log/"
git commit -m "feat(web): admin audit-log page with pagination — Step 9 complete"
```
