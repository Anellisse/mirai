# Mirai — Plan 1: Monorepo Foundation + Prisma Schema + Auth & RBAC

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el andamiaje completo del monorepo: estructura de paquetes, esquema Prisma con todas las entidades, autenticación JWT con 2FA para admins, y RBAC por roles.

**Architecture:** Monorepo pnpm + Turborepo con dos apps (`web` Next.js 14 App Router, `api` NestJS 10) y dos paquetes compartidos (`shared-types`, `clinical-constants`). Auth dual: Auth.js v5 en el frontend (sesiones), Passport-JWT en el backend (API). Prisma 5 contra PostgreSQL 16 vía Docker.

**Tech Stack:** Node 20 LTS · pnpm 9 · Turborepo 2 · Next.js 14 · NestJS 10 · TypeScript 5 · Prisma 5 · PostgreSQL 16 · Auth.js v5 · passport-jwt · speakeasy (TOTP 2FA) · bcryptjs (rounds=12) · Docker Compose

---

## Mapa de archivos

```
apps/
  api/
    src/
      app.module.ts
      main.ts
      modules/
        auth/
          auth.module.ts
          auth.controller.ts
          auth.service.ts
          strategies/
            jwt.strategy.ts
            local.strategy.ts
          guards/
            jwt-auth.guard.ts
            roles.guard.ts
          decorators/
            roles.decorator.ts
            current-user.decorator.ts
          dto/
            login.dto.ts
            register.dto.ts
            verify-2fa.dto.ts
          __tests__/
            auth.service.spec.ts
            auth.controller.e2e-spec.ts
        users/
          users.module.ts
          users.service.ts
          users.controller.ts
          dto/
            create-user.dto.ts
          __tests__/
            users.service.spec.ts
    test/
      jest-e2e.json
      app.e2e-spec.ts
    .env.example
    nest-cli.json
    tsconfig.json
    package.json
  web/
    src/
      app/
        (auth)/
          login/
            page.tsx
            _components/
              login-form.tsx
        (dashboard)/
          layout.tsx
          page.tsx
        layout.tsx
        page.tsx
      lib/
        auth.ts          # Auth.js config
        session.ts       # getSession helper
      components/
        ui/              # shadcn components
      middleware.ts      # route protection
    .env.example
    next.config.ts
    tailwind.config.ts
    package.json
packages/
  shared-types/
    src/
      index.ts
      enums/
        roles.ts
        report-status.ts
        section-types.ts
        framework-types.ts
      types/
        user.ts
        report.ts
        patient.ts
    package.json
    tsconfig.json
  clinical-constants/
    src/
      index.ts
      frameworks.ts      # SNP_CHC y STANDARD configs
      descriptors.ts     # escala 1-5 normalizada
    package.json
    tsconfig.json
prisma/
  schema.prisma
  migrations/            # generadas por Prisma
  seed/
    index.ts
    01-frameworks.ts
    02-tests-catalog.ts
    03-admin-user.ts
docker/
  docker-compose.yml
  docker-compose.prod.yml
  nginx/
    nginx.conf
  .env.example
turbo.json
pnpm-workspace.yaml
package.json
tsconfig.base.json
.env.example
```

---

## Task 1: Monorepo Init (pnpm + Turborepo)

**Files:**
- Create: `package.json` (root)
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.env.example`

- [ ] **Step 1.1: Inicializar el monorepo**

```bash
cd "C:\Users\cavir\OneDrive\Proyecto Mirai - V2"
git init
pnpm init
```

- [ ] **Step 1.2: Crear estructura de directorios**

```bash
mkdir -p apps/api apps/web packages/shared-types/src packages/clinical-constants/src prisma/seed docker/nginx docs/superpowers/plans storage
```

- [ ] **Step 1.3: Crear `pnpm-workspace.yaml`**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 1.4: Crear `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "test:e2e": {
      "dependsOn": ["^build"],
      "cache": false
    },
    "lint": {},
    "type-check": {
      "dependsOn": ["^build"]
    }
  }
}
```

- [ ] **Step 1.5: Crear `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 1.6: Crear `package.json` root**

```json
{
  "name": "mirai",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint",
    "type-check": "turbo type-check",
    "db:migrate": "prisma migrate dev --schema=prisma/schema.prisma",
    "db:generate": "prisma generate --schema=prisma/schema.prisma",
    "db:seed": "tsx prisma/seed/index.ts",
    "db:studio": "prisma studio --schema=prisma/schema.prisma"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0",
    "tsx": "^4.11.0",
    "prisma": "^5.14.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  },
  "packageManager": "pnpm@9.0.0"
}
```

- [ ] **Step 1.7: Crear `.gitignore`**

```gitignore
node_modules/
.turbo/
dist/
.next/
*.env
!*.env.example
storage/
prisma/migrations/
.DS_Store
```

- [ ] **Step 1.8: Crear `.env.example` (root)**

```bash
# Database
DATABASE_URL="postgresql://mirai:mirai_secret@localhost:5432/mirai_dev"

# JWT
JWT_SECRET="change_me_at_least_64_chars_long_random_string_here"
JWT_REFRESH_SECRET="another_random_64_chars_string_for_refresh_tokens"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Next.js Auth.js
NEXTAUTH_SECRET="yet_another_random_32_chars_minimum"
NEXTAUTH_URL="http://localhost:3000"

# API
API_URL="http://localhost:3001"
```

- [ ] **Step 1.9: Instalar dependencias root**

```bash
pnpm install
```

- [ ] **Step 1.10: Commit**

```bash
git add .
git commit -m "chore: initialize monorepo with pnpm workspaces and turborepo"
```

---

## Task 2: Paquete `shared-types`

**Files:**
- Create: `packages/shared-types/package.json`
- Create: `packages/shared-types/tsconfig.json`
- Create: `packages/shared-types/src/enums/roles.ts`
- Create: `packages/shared-types/src/enums/report-status.ts`
- Create: `packages/shared-types/src/enums/section-types.ts`
- Create: `packages/shared-types/src/enums/framework-types.ts`
- Create: `packages/shared-types/src/types/user.ts`
- Create: `packages/shared-types/src/types/report.ts`
- Create: `packages/shared-types/src/types/patient.ts`
- Create: `packages/shared-types/src/index.ts`

- [ ] **Step 2.1: Crear `packages/shared-types/package.json`**

```json
{
  "name": "@mirai/shared-types",
  "version": "0.1.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2.2: Crear `packages/shared-types/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 2.3: Crear `packages/shared-types/src/enums/roles.ts`**

```typescript
export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  CLINICO_SENIOR = 'CLINICO_SENIOR',
  CLINICO = 'CLINICO',
  SUPERVISOR = 'SUPERVISOR',
}

export const ROLES_THAT_REQUIRE_SUPERVISOR: Role[] = [Role.CLINICO];
export const ADMIN_ROLES: Role[] = [Role.SUPER_ADMIN, Role.ADMIN];
```

- [ ] **Step 2.4: Crear `packages/shared-types/src/enums/report-status.ts`**

```typescript
export enum ReportStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  SUPERVISOR_REVIEW = 'SUPERVISOR_REVIEW',
  APPROVED = 'APPROVED',
  EXPORTED = 'EXPORTED',
  FINAL = 'FINAL',
}

export const VALID_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  [ReportStatus.DRAFT]: [ReportStatus.IN_PROGRESS],
  [ReportStatus.IN_PROGRESS]: [ReportStatus.REVIEW],
  [ReportStatus.REVIEW]: [ReportStatus.SUPERVISOR_REVIEW, ReportStatus.APPROVED],
  [ReportStatus.SUPERVISOR_REVIEW]: [ReportStatus.APPROVED, ReportStatus.IN_PROGRESS],
  [ReportStatus.APPROVED]: [ReportStatus.EXPORTED],
  [ReportStatus.EXPORTED]: [ReportStatus.FINAL],
  [ReportStatus.FINAL]: [],
};
```

- [ ] **Step 2.5: Crear `packages/shared-types/src/enums/section-types.ts`**

```typescript
export enum SectionType {
  IDENTIFICATION = 'IDENTIFICATION',
  CONSULTATION_REASON = 'CONSULTATION_REASON',
  BACKGROUND = 'BACKGROUND',
  PROCEDURE_TESTS = 'PROCEDURE_TESTS',
  OBSERVED_BEHAVIOR = 'OBSERVED_BEHAVIOR',
  QUESTIONNAIRE_SYMPTOMS = 'QUESTIONNAIRE_SYMPTOMS',
  COGNITIVE_EVALUATION = 'COGNITIVE_EVALUATION',
  SOCIAL_COGNITION = 'SOCIAL_COGNITION',
  RESULTS_SYNTHESIS = 'RESULTS_SYNTHESIS',
  CONCLUSIONS = 'CONCLUSIONS',
  RECOMMENDATIONS = 'RECOMMENDATIONS',
  ANNEXES = 'ANNEXES',
}

export enum SectionStatus {
  PENDING = 'PENDING',
  AI_GENERATED = 'AI_GENERATED',
  CLINICIAN_REVIEWING = 'CLINICIAN_REVIEWING',
  APPROVED = 'APPROVED',
}

export enum GeneratedBy {
  HUMAN = 'HUMAN',
  AI = 'AI',
  RULES = 'RULES',
}

export const AI_GENERATED_SECTIONS: SectionType[] = [
  SectionType.BACKGROUND,
  SectionType.OBSERVED_BEHAVIOR,
];
```

- [ ] **Step 2.6: Crear `packages/shared-types/src/enums/framework-types.ts`**

```typescript
export enum FrameworkCode {
  SNP_CHC = 'SNP_CHC',
  STANDARD = 'STANDARD',
}

export enum ImportSource {
  Q_GLOBAL = 'Q_GLOBAL',
  TEA_CORRIGE = 'TEA_CORRIGE',
  CEDETI = 'CEDETI',
  MANUAL = 'MANUAL',
}

export enum AccessRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum FinalReportSource {
  SYSTEM_PDF = 'SYSTEM_PDF',
  UPLOADED = 'UPLOADED',
}
```

- [ ] **Step 2.7: Crear `packages/shared-types/src/types/user.ts`**

```typescript
import { Role } from '../enums/roles';

export interface UserPayload {
  sub: string;
  email: string;
  role: Role;
  organizationId: string;
  twoFactorVerified: boolean;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  organizationId: string;
}
```

- [ ] **Step 2.8: Crear `packages/shared-types/src/types/patient.ts`**

```typescript
export interface PatientIdentifier {
  id: string;
  name: string;
  maskedName?: string;
}
```

- [ ] **Step 2.9: Crear `packages/shared-types/src/types/report.ts`**

```typescript
import { ReportStatus } from '../enums/report-status';
import { SectionType } from '../enums/section-types';
import { FrameworkCode } from '../enums/framework-types';

export interface ReportSummary {
  id: string;
  patientId: string;
  patientMaskedName: string;
  authorName: string;
  status: ReportStatus;
  frameworkCode: FrameworkCode;
  createdAt: string;
  updatedAt: string;
}

export interface SectionContent {
  sectionType: SectionType;
  content: unknown;
}
```

- [ ] **Step 2.10: Crear `packages/shared-types/src/index.ts`**

```typescript
export * from './enums/roles';
export * from './enums/report-status';
export * from './enums/section-types';
export * from './enums/framework-types';
export * from './types/user';
export * from './types/patient';
export * from './types/report';
```

- [ ] **Step 2.11: Build shared-types**

```bash
pnpm --filter @mirai/shared-types build
```

Expected: `packages/shared-types/dist/` generado sin errores TypeScript.

- [ ] **Step 2.12: Commit**

```bash
git add packages/shared-types
git commit -m "feat(packages): add shared-types package with enums and core interfaces"
```

---

## Task 3: Paquete `clinical-constants`

**Files:**
- Create: `packages/clinical-constants/package.json`
- Create: `packages/clinical-constants/tsconfig.json`
- Create: `packages/clinical-constants/src/frameworks.ts`
- Create: `packages/clinical-constants/src/descriptors.ts`
- Create: `packages/clinical-constants/src/index.ts`

- [ ] **Step 3.1: Crear `packages/clinical-constants/package.json`**

```json
{
  "name": "@mirai/clinical-constants",
  "version": "0.1.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "@mirai/shared-types": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 3.2: Crear `packages/clinical-constants/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3.3: Crear `packages/clinical-constants/src/frameworks.ts`**

```typescript
import { FrameworkCode } from '@mirai/shared-types';

export interface DomainConfig {
  code: string;
  name: string;
  axis?: number;
  orderIndex: number;
}

export interface FrameworkConfig {
  code: FrameworkCode;
  name: string;
  defaultIntelligenceTest: string;
  domains: DomainConfig[];
}

export const FRAMEWORKS: FrameworkConfig[] = [
  {
    code: FrameworkCode.SNP_CHC,
    name: 'SNP-CHC (Infanto-Juvenil)',
    defaultIntelligenceTest: 'WISC-V',
    domains: [
      { code: 'SENSORIOMOTOR_PRAXIAS', name: 'Sensoriomotor y praxias', axis: 1, orderIndex: 1 },
      { code: 'VISUOESPACIAL', name: 'Visuoespacial', axis: 2, orderIndex: 2 },
      { code: 'MEMORIA_EPISODICA_VERBAL', name: 'Memoria episódica verbal', axis: 2, orderIndex: 3 },
      { code: 'MEMORIA_EPISODICA_VISUAL', name: 'Memoria episódica visual', axis: 2, orderIndex: 4 },
      { code: 'FUNCIONES_EJECUTIVAS', name: 'Funciones ejecutivas', axis: 2, orderIndex: 5 },
      { code: 'ATENCION', name: 'Atención', axis: 3, orderIndex: 6 },
      { code: 'MEMORIA_TRABAJO', name: 'Memoria de trabajo', axis: 3, orderIndex: 7 },
      { code: 'VELOCIDAD_PROCESAMIENTO', name: 'Velocidad de procesamiento', axis: 3, orderIndex: 8 },
      { code: 'LENGUAJE', name: 'Lenguaje', axis: 4, orderIndex: 9 },
      { code: 'COGNICION_SOCIAL', name: 'Cognición social', axis: undefined, orderIndex: 10 },
    ],
  },
  {
    code: FrameworkCode.STANDARD,
    name: 'Estándar por funciones (Adultos)',
    defaultIntelligenceTest: 'WAIS-IV',
    domains: [
      { code: 'SENSORIOMOTOR', name: 'Sensoriomotor', orderIndex: 1 },
      { code: 'VISUOESPACIAL', name: 'Visuoespacial', orderIndex: 2 },
      { code: 'ATENCION', name: 'Atención', orderIndex: 3 },
      { code: 'LENGUAJE', name: 'Lenguaje', orderIndex: 4 },
      { code: 'MEMORIA', name: 'Memoria', orderIndex: 5 },
      { code: 'FUNCIONES_EJECUTIVAS', name: 'Funciones ejecutivas', orderIndex: 6 },
      { code: 'INTELIGENCIA', name: 'Inteligencia', orderIndex: 7 },
    ],
  },
];
```

- [ ] **Step 3.4: Crear `packages/clinical-constants/src/descriptors.ts`**

```typescript
export interface ScoreDescriptor {
  level: number;
  label: string;
  percentileRange: [number, number];
  ssRange?: [number, number];
}

export const SCORE_DESCRIPTORS: ScoreDescriptor[] = [
  { level: 1, label: 'Muy bajo', percentileRange: [0, 5], ssRange: [40, 70] },
  { level: 2, label: 'Bajo', percentileRange: [6, 16], ssRange: [71, 84] },
  { level: 3, label: 'Promedio bajo', percentileRange: [17, 24], ssRange: [85, 89] },
  { level: 4, label: 'Promedio', percentileRange: [25, 74], ssRange: [90, 109] },
  { level: 5, label: 'Promedio alto', percentileRange: [75, 83], ssRange: [110, 115] },
  { level: 6, label: 'Alto', percentileRange: [84, 94], ssRange: [116, 129] },
  { level: 7, label: 'Muy alto', percentileRange: [95, 100], ssRange: [130, 160] },
];

export function descriptorFromStandardScore(ss: number): ScoreDescriptor {
  return (
    SCORE_DESCRIPTORS.find(
      (d) => d.ssRange && ss >= d.ssRange[0] && ss <= d.ssRange[1],
    ) ?? SCORE_DESCRIPTORS[0]
  );
}

export function descriptorFromPercentile(p: number): ScoreDescriptor {
  return (
    SCORE_DESCRIPTORS.find(
      (d) => p >= d.percentileRange[0] && p <= d.percentileRange[1],
    ) ?? SCORE_DESCRIPTORS[0]
  );
}
```

- [ ] **Step 3.5: Crear `packages/clinical-constants/src/index.ts`**

```typescript
export * from './frameworks';
export * from './descriptors';
```

- [ ] **Step 3.6: Build clinical-constants**

```bash
pnpm --filter @mirai/clinical-constants build
```

Expected: compilado sin errores.

- [ ] **Step 3.7: Commit**

```bash
git add packages/clinical-constants
git commit -m "feat(packages): add clinical-constants with frameworks and score descriptors"
```

---

## Task 4: Esquema Prisma

**Files:**
- Create: `prisma/schema.prisma`

- [ ] **Step 4.1: Crear `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ───────────────────────────────────────────────────────────────────

enum Role {
  SUPER_ADMIN
  ADMIN
  CLINICO_SENIOR
  CLINICO
  SUPERVISOR
}

enum ReportStatus {
  DRAFT
  IN_PROGRESS
  REVIEW
  SUPERVISOR_REVIEW
  APPROVED
  EXPORTED
  FINAL
}

enum SectionType {
  IDENTIFICATION
  CONSULTATION_REASON
  BACKGROUND
  PROCEDURE_TESTS
  OBSERVED_BEHAVIOR
  QUESTIONNAIRE_SYMPTOMS
  COGNITIVE_EVALUATION
  SOCIAL_COGNITION
  RESULTS_SYNTHESIS
  CONCLUSIONS
  RECOMMENDATIONS
  ANNEXES
}

enum SectionStatus {
  PENDING
  AI_GENERATED
  CLINICIAN_REVIEWING
  APPROVED
}

enum GeneratedBy {
  HUMAN
  AI
  RULES
}

enum ImportSource {
  Q_GLOBAL
  TEA_CORRIGE
  CEDETI
  MANUAL
}

enum FinalReportSource {
  SYSTEM_PDF
  UPLOADED
}

enum AccessRequestStatus {
  PENDING
  APPROVED
  REJECTED
}

// ─── Organization ─────────────────────────────────────────────────────────────

model Organization {
  id        String   @id @default(cuid())
  name      String
  subtitle  String?
  logoUrl   String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users    User[]
  patients Patient[]
}

// ─── User ─────────────────────────────────────────────────────────────────────

model User {
  id                  String    @id @default(cuid())
  email               String    @unique
  passwordHash        String
  name                String
  title               String?
  registrationNumber  String?
  role                Role
  organizationId      String
  twoFactorEnabled    Boolean   @default(false)
  twoFactorSecret     String?
  isActive            Boolean   @default(true)
  failedLoginAttempts Int       @default(0)
  lockedUntil         DateTime?
  lastLoginAt         DateTime?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  organization      Organization    @relation(fields: [organizationId], references: [id])
  authoredReports   Report[]        @relation("AuthorReports")
  supervisedReports Report[]        @relation("SupervisorReports")
  auditLogs         AuditLog[]
  accessRequests    AccessRequest[] @relation("RequesterRequests")
  reviewedRequests  AccessRequest[] @relation("ReviewerRequests")
  accessGrants      AccessGrant[]   @relation("UserGrants")
  grantedAccess     AccessGrant[]   @relation("GrantedByUser")
  finalReports      FinalReport[]
  dictionaryEdits   DictionaryHistory[]
}

// ─── Patient ──────────────────────────────────────────────────────────────────

model Patient {
  id             String    @id @default(cuid())
  organizationId String
  rutEncrypted   String?
  name           String
  birthDate      DateTime?
  gender         String?
  email          String?
  phone          String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  deletedAt      DateTime?

  organization Organization @relation(fields: [organizationId], references: [id])
  reports      Report[]
}

// ─── Report ───────────────────────────────────────────────────────────────────

model Report {
  id                 String       @id @default(cuid())
  patientId          String
  authorId           String
  supervisorId       String?
  organizationId     String
  status             ReportStatus @default(DRAFT)
  frameworkCode      String
  version            Int          @default(1)
  selectedTests      String[]
  omitCit            Boolean      @default(false)
  lockedBy           String?
  lockedAt           DateTime?
  consultationReason String?
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt
  deletedAt          DateTime?

  patient         Patient         @relation(fields: [patientId], references: [id])
  author          User            @relation("AuthorReports", fields: [authorId], references: [id])
  supervisor      User?           @relation("SupervisorReports", fields: [supervisorId], references: [id])
  sections        ReportSection[]
  testResults     TestResult[]
  accessRequests  AccessRequest[]
  accessGrants    AccessGrant[]
  finalReport     FinalReport?
  importedReports ImportedScoreReport[]
  interviewForm   InterviewForm?
  observationChecklist ObservationChecklist?
  clinicalConclusion   ClinicalConclusion?
  recommendations      ReportRecommendation[]
}

// ─── ReportSection ────────────────────────────────────────────────────────────

model ReportSection {
  id              String        @id @default(cuid())
  reportId        String
  sectionType     SectionType
  status          SectionStatus @default(PENDING)
  content         String?
  sourceData      Json?
  generatedBy     GeneratedBy   @default(HUMAN)
  aiRawOutput     String?
  clinicianEdited Boolean       @default(false)
  approvedBy      String?
  approvedAt      DateTime?
  orderIndex      Int           @default(0)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  report Report @relation(fields: [reportId], references: [id])

  @@unique([reportId, sectionType])
}

// ─── Framework & Tests ────────────────────────────────────────────────────────

model EvaluationFrameworkConfig {
  id          String  @id @default(cuid())
  code        String  @unique
  name        String
  description String?
  isActive    Boolean @default(true)

  domains CognitiveDomain[]
}

model CognitiveDomain {
  id          String  @id @default(cuid())
  frameworkId String
  code        String
  name        String
  axis        Int?
  orderIndex  Int     @default(0)

  framework EvaluationFrameworkConfig @relation(fields: [frameworkId], references: [id])
  tests     CognitiveTest[]
}

model CognitiveTest {
  id                   String   @id @default(cuid())
  code                 String   @unique
  name                 String
  abbreviation         String?
  type                 String
  applicableFrameworks String[]
  requiresInformant    Boolean  @default(false)
  domainId             String?
  isActive             Boolean  @default(true)
  orderIndex           Int      @default(0)

  domain      CognitiveDomain? @relation(fields: [domainId], references: [id])
  testResults TestResult[]
}

model TestResult {
  id           String    @id @default(cuid())
  reportId     String
  testId       String
  scores       Json
  descriptor   String?
  notes        String?
  importedFrom String?
  validatedAt  DateTime?
  validatedBy  String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  report Report        @relation(fields: [reportId], references: [id])
  test   CognitiveTest @relation(fields: [testId], references: [id])
}

// ─── Interview & Observation ──────────────────────────────────────────────────

model InterviewForm {
  id        String   @id @default(cuid())
  reportId  String   @unique
  data      Json
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  report Report @relation(fields: [reportId], references: [id])
}

model ObservationChecklist {
  id        String   @id @default(cuid())
  reportId  String   @unique
  data      Json
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  report Report @relation(fields: [reportId], references: [id])
}

// ─── Clinical Dictionary ──────────────────────────────────────────────────────

model ClinicalDictionary {
  id        String   @id @default(cuid())
  code      String   @unique
  category  String
  content   String
  variables Json?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  history DictionaryHistory[]
}

model DictionaryHistory {
  id           String   @id @default(cuid())
  dictionaryId String
  content      String
  editedById   String
  editedAt     DateTime @default(now())

  dictionary ClinicalDictionary @relation(fields: [dictionaryId], references: [id])
  editedBy   User               @relation(fields: [editedById], references: [id])
}

// ─── Recommendations ──────────────────────────────────────────────────────────

model RecommendationBlock {
  id       String  @id @default(cuid())
  code     String  @unique
  title    String
  content  String
  category String
  isActive Boolean @default(true)

  rules       RecommendationRule[]
  reportRecs  ReportRecommendation[]
}

model RecommendationRule {
  id        String @id @default(cuid())
  blockId   String
  condition Json
  priority  Int    @default(0)

  block RecommendationBlock @relation(fields: [blockId], references: [id])
}

model ReportRecommendation {
  id         String  @id @default(cuid())
  reportId   String
  blockId    String
  customText String?
  orderIndex Int     @default(0)

  report Report              @relation(fields: [reportId], references: [id])
  block  RecommendationBlock @relation(fields: [blockId], references: [id])
}

// ─── Conclusions ──────────────────────────────────────────────────────────────

model ClinicalConclusion {
  id         String    @id @default(cuid())
  reportId   String    @unique
  content    String
  aiDraft    String?
  approvedAt DateTime?
  approvedBy String?

  report     Report               @relation(fields: [reportId], references: [id])
  hypotheses DiagnosticHypothesis[]
}

model DiagnosticHypothesis {
  id           String @id @default(cuid())
  conclusionId String
  content      String
  orderIndex   Int    @default(0)

  conclusion ClinicalConclusion @relation(fields: [conclusionId], references: [id])
}

// ─── PDF Import ───────────────────────────────────────────────────────────────

model ImportedScoreReport {
  id               String      @id @default(cuid())
  reportId         String
  source           ImportSource
  pdfHash          String
  pdfPath          String
  rawExtractedData Json?
  validatedData    Json?
  validatedAt      DateTime?
  validatedById    String?
  createdAt        DateTime    @default(now())

  report Report @relation(fields: [reportId], references: [id])
}

// ─── Access Control ───────────────────────────────────────────────────────────

model AccessRequest {
  id              String              @id @default(cuid())
  requesterId     String
  reportId        String
  reason          String
  status          AccessRequestStatus @default(PENDING)
  reviewedById    String?
  reviewedAt      DateTime?
  rejectionReason String?
  createdAt       DateTime            @default(now())

  requester  User         @relation("RequesterRequests", fields: [requesterId], references: [id])
  reviewedBy User?        @relation("ReviewerRequests", fields: [reviewedById], references: [id])
  report     Report       @relation(fields: [reportId], references: [id])
  grant      AccessGrant?
}

model AccessGrant {
  id         String    @id @default(cuid())
  requestId  String    @unique
  userId     String
  reportId   String
  expiresAt  DateTime?
  grantedById String
  createdAt  DateTime  @default(now())

  request   AccessRequest @relation(fields: [requestId], references: [id])
  user      User          @relation("UserGrants", fields: [userId], references: [id])
  report    Report        @relation(fields: [reportId], references: [id])
  grantedBy User          @relation("GrantedByUser", fields: [grantedById], references: [id])
}

// ─── Final Report ─────────────────────────────────────────────────────────────

model FinalReport {
  id            String            @id @default(cuid())
  reportId      String            @unique
  source        FinalReportSource
  fileHash      String
  filePath      String
  finalizedById String
  signature     String
  version       Int               @default(1)
  createdAt     DateTime          @default(now())

  report       Report @relation(fields: [reportId], references: [id])
  finalizedBy  User   @relation(fields: [finalizedById], references: [id])
}

// ─── Audit Log (append-only) ──────────────────────────────────────────────────

model AuditLog {
  id         String   @id @default(cuid())
  userId     String?
  action     String
  resource   String
  resourceId String?
  metadata   Json?
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime @default(now())

  user User? @relation(fields: [userId], references: [id])
}
```

- [ ] **Step 4.2: Instalar @prisma/client en root**

```bash
pnpm add @prisma/client
```

- [ ] **Step 4.3: Generar Prisma client**

```bash
pnpm db:generate
```

Expected: `node_modules/.prisma/client/` generado.

- [ ] **Step 4.4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(prisma): add complete schema with all clinical entities"
```

---

## Task 5: Docker Compose (Dev) + Primera migración

**Files:**
- Create: `docker/docker-compose.yml`
- Create: `docker/.env.example`

- [ ] **Step 5.1: Crear `docker/docker-compose.yml`**

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    container_name: mirai-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: mirai
      POSTGRES_PASSWORD: mirai_secret
      POSTGRES_DB: mirai_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mirai -d mirai_dev"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Descomentar para producción:
  # nginx:
  #   image: nginx:alpine
  #   ports:
  #     - "80:80"
  #     - "443:443"

volumes:
  postgres_data:
```

- [ ] **Step 5.2: Levantar la base de datos**

```bash
cd docker
docker compose up -d postgres
cd ..
```

Expected: `mirai-postgres` corriendo. Verificar con:
```bash
docker ps | grep mirai-postgres
```

- [ ] **Step 5.3: Crear archivo `.env` (root, desde .env.example)**

```bash
cp .env.example .env
```

Verificar que `DATABASE_URL` sea `postgresql://mirai:mirai_secret@localhost:5432/mirai_dev`.

- [ ] **Step 5.4: Ejecutar primera migración**

```bash
pnpm db:migrate
```

Cuando pregunte el nombre de la migración, ingresar: `init_schema`

Expected: `prisma/migrations/TIMESTAMP_init_schema/migration.sql` creado, migración aplicada.

- [ ] **Step 5.5: Verificar tablas**

```bash
pnpm db:studio
```

Abrir `http://localhost:5555` y verificar que todas las tablas existen.

- [ ] **Step 5.6: Commit**

```bash
git add docker/ prisma/migrations/
git commit -m "feat(infra): add docker-compose for local postgres and run initial migration"
```

---

## Task 6: Seed — Frameworks, Tests y Admin inicial

**Files:**
- Create: `prisma/seed/01-frameworks.ts`
- Create: `prisma/seed/02-tests-catalog.ts`
- Create: `prisma/seed/03-admin-user.ts`
- Create: `prisma/seed/index.ts`

- [ ] **Step 6.1: Crear `prisma/seed/01-frameworks.ts`**

```typescript
import { PrismaClient } from '@prisma/client';
import { FRAMEWORKS } from '../../packages/clinical-constants/src';

export async function seedFrameworks(prisma: PrismaClient) {
  for (const fw of FRAMEWORKS) {
    const framework = await prisma.evaluationFrameworkConfig.upsert({
      where: { code: fw.code },
      update: { name: fw.name },
      create: { code: fw.code, name: fw.name },
    });

    for (const domain of fw.domains) {
      await prisma.cognitiveDomain.upsert({
        where: { id: `${fw.code}_${domain.code}` },
        update: { name: domain.name, axis: domain.axis, orderIndex: domain.orderIndex },
        create: {
          id: `${fw.code}_${domain.code}`,
          frameworkId: framework.id,
          code: domain.code,
          name: domain.name,
          axis: domain.axis ?? null,
          orderIndex: domain.orderIndex,
        },
      });
    }
  }
  console.log('✓ Frameworks and domains seeded');
}
```

- [ ] **Step 6.2: Crear `prisma/seed/02-tests-catalog.ts`**

```typescript
import { PrismaClient } from '@prisma/client';

const TESTS_CATALOG = [
  {
    code: 'WISC-V',
    name: 'Escala de Inteligencia de Wechsler para Niños - V',
    abbreviation: 'WISC-V',
    type: 'intelligence',
    applicableFrameworks: ['SNP_CHC', 'STANDARD'],
    requiresInformant: false,
    domainId: 'SNP_CHC_FUNCIONES_EJECUTIVAS',
    orderIndex: 1,
  },
  {
    code: 'WAIS-IV',
    name: 'Escala de Inteligencia de Wechsler para Adultos - IV',
    abbreviation: 'WAIS-IV',
    type: 'intelligence',
    applicableFrameworks: ['SNP_CHC', 'STANDARD'],
    requiresInformant: false,
    domainId: 'STANDARD_INTELIGENCIA',
    orderIndex: 2,
  },
  {
    code: 'TFCRO',
    name: 'Test de la Figura Compleja de Rey-Osterrieth',
    abbreviation: 'TFCRO',
    type: 'cognitive',
    applicableFrameworks: ['SNP_CHC', 'STANDARD'],
    requiresInformant: false,
    orderIndex: 3,
  },
  {
    code: 'TAVEC',
    name: 'Test de Aprendizaje Verbal España-Complutense',
    abbreviation: 'TAVEC',
    type: 'cognitive',
    applicableFrameworks: ['STANDARD'],
    requiresInformant: false,
    orderIndex: 4,
  },
  {
    code: 'TAVECI',
    name: 'Test de Aprendizaje Verbal España-Complutense Infantil',
    abbreviation: 'TAVECI',
    type: 'cognitive',
    applicableFrameworks: ['SNP_CHC'],
    requiresInformant: false,
    orderIndex: 5,
  },
  {
    code: 'WCST',
    name: 'Wisconsin Card Sorting Test',
    abbreviation: 'WCST',
    type: 'cognitive',
    applicableFrameworks: ['SNP_CHC', 'STANDARD'],
    requiresInformant: false,
    orderIndex: 6,
  },
  {
    code: 'TMT',
    name: 'Trail Making Test',
    abbreviation: 'TMT',
    type: 'cognitive',
    applicableFrameworks: ['SNP_CHC', 'STANDARD'],
    requiresInformant: false,
    orderIndex: 7,
  },
  {
    code: 'CARAS-R',
    name: 'Test de Percepción de Diferencias-Revisado',
    abbreviation: 'CARAS-R',
    type: 'cognitive',
    applicableFrameworks: ['SNP_CHC', 'STANDARD'],
    requiresInformant: false,
    orderIndex: 8,
  },
  {
    code: 'ADOS-2',
    name: 'Autism Diagnostic Observation Schedule - 2',
    abbreviation: 'ADOS-2',
    type: 'social-cognition',
    applicableFrameworks: ['SNP_CHC'],
    requiresInformant: false,
    orderIndex: 9,
  },
  {
    code: 'ADI-R',
    name: 'Autism Diagnostic Interview-Revised',
    abbreviation: 'ADI-R',
    type: 'social-cognition',
    applicableFrameworks: ['SNP_CHC'],
    requiresInformant: true,
    orderIndex: 10,
  },
  {
    code: 'BASC-3',
    name: 'Behavior Assessment System for Children - 3',
    abbreviation: 'BASC-3',
    type: 'questionnaire',
    applicableFrameworks: ['SNP_CHC'],
    requiresInformant: true,
    orderIndex: 11,
  },
  {
    code: 'ASRS-18',
    name: 'Adult ADHD Self-Report Scale',
    abbreviation: 'ASRS-18',
    type: 'questionnaire',
    applicableFrameworks: ['STANDARD'],
    requiresInformant: false,
    orderIndex: 12,
  },
  {
    code: 'DEX-SP',
    name: 'Dysexecutive Questionnaire - Spanish',
    abbreviation: 'DEX-Sp',
    type: 'questionnaire',
    applicableFrameworks: ['STANDARD'],
    requiresInformant: false,
    orderIndex: 13,
  },
  {
    code: 'BAI',
    name: 'Beck Anxiety Inventory',
    abbreviation: 'BAI',
    type: 'questionnaire',
    applicableFrameworks: ['STANDARD'],
    requiresInformant: false,
    orderIndex: 14,
  },
  {
    code: 'BDI-II',
    name: 'Beck Depression Inventory - II',
    abbreviation: 'BDI-II',
    type: 'questionnaire',
    applicableFrameworks: ['STANDARD'],
    requiresInformant: false,
    orderIndex: 15,
  },
];

export async function seedTestsCatalog(prisma: PrismaClient) {
  for (const test of TESTS_CATALOG) {
    await prisma.cognitiveTest.upsert({
      where: { code: test.code },
      update: {
        name: test.name,
        applicableFrameworks: test.applicableFrameworks,
        requiresInformant: test.requiresInformant,
      },
      create: {
        code: test.code,
        name: test.name,
        abbreviation: test.abbreviation,
        type: test.type,
        applicableFrameworks: test.applicableFrameworks,
        requiresInformant: test.requiresInformant,
        orderIndex: test.orderIndex,
      },
    });
  }
  console.log('✓ Tests catalog seeded (15 instruments)');
}
```

- [ ] **Step 6.3: Crear `prisma/seed/03-admin-user.ts`**

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function seedAdminUser(prisma: PrismaClient) {
  const org = await prisma.organization.upsert({
    where: { id: 'org_neuropsia' },
    update: {},
    create: {
      id: 'org_neuropsia',
      name: 'Centro Neuropsia',
      subtitle: 'Neuropsicología Clínica',
    },
  });

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@neuropsia.cl';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMeNow2024!';

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      name: 'Administrador',
      role: 'SUPER_ADMIN',
      organizationId: org.id,
    },
  });
  console.log(`✓ Admin user created: ${adminEmail}`);
  console.log('  ⚠️  Change the password immediately after first login');
}
```

- [ ] **Step 6.4: Crear `prisma/seed/index.ts`**

```typescript
import { PrismaClient } from '@prisma/client';
import { seedFrameworks } from './01-frameworks';
import { seedTestsCatalog } from './02-tests-catalog';
import { seedAdminUser } from './03-admin-user';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  await seedFrameworks(prisma);
  await seedTestsCatalog(prisma);
  await seedAdminUser(prisma);
  console.log('✅ Database seeded successfully');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 6.5: Agregar seed script a `package.json` root (ya existe)**

Verificar que en `package.json` root el script `db:seed` sea:
```json
"db:seed": "tsx prisma/seed/index.ts"
```

- [ ] **Step 6.6: Instalar bcryptjs**

```bash
pnpm add bcryptjs
pnpm add -D @types/bcryptjs
```

- [ ] **Step 6.7: Ejecutar seed**

```bash
pnpm db:seed
```

Expected:
```
🌱 Seeding database...
✓ Frameworks and domains seeded
✓ Tests catalog seeded (15 instruments)
✓ Admin user created: admin@neuropsia.cl
✅ Database seeded successfully
```

- [ ] **Step 6.8: Commit**

```bash
git add prisma/seed/
git commit -m "feat(seed): add frameworks, tests catalog, and initial admin user"
```

---

## Task 7: NestJS API Bootstrap

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/nest-cli.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/tsconfig.build.json`
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.module.ts`
- Create: `apps/api/src/prisma.service.ts`
- Create: `apps/api/.env.example`

- [ ] **Step 7.1: Crear `apps/api/package.json`**

```json
{
  "name": "@mirai/api",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "nest build",
    "dev": "nest start --watch",
    "start": "node dist/main",
    "test": "jest",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@mirai/shared-types": "workspace:*",
    "@nestjs/common": "^10.3.0",
    "@nestjs/core": "^10.3.0",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/passport": "^10.0.3",
    "@nestjs/platform-express": "^10.3.0",
    "@prisma/client": "^5.14.0",
    "bcryptjs": "^2.4.3",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.1",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "passport-local": "^1.0.0",
    "reflect-metadata": "^0.2.0",
    "rxjs": "^7.8.1",
    "speakeasy": "^2.0.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.3.0",
    "@nestjs/schematics": "^10.1.0",
    "@nestjs/testing": "^10.3.0",
    "@types/bcryptjs": "^2.4.6",
    "@types/jest": "^29.5.12",
    "@types/node": "^20.14.0",
    "@types/passport-jwt": "^4.0.1",
    "@types/passport-local": "^1.0.38",
    "@types/speakeasy": "^2.0.10",
    "jest": "^29.7.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.1.4",
    "ts-node": "^10.9.2",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 7.2: Crear `apps/api/nest-cli.json`**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

- [ ] **Step 7.3: Crear `apps/api/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "commonjs",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "paths": {
      "@mirai/shared-types": ["../../packages/shared-types/src"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 7.4: Crear `apps/api/tsconfig.build.json`**

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "dist", "**/*.spec.ts", "**/*.e2e-spec.ts"]
}
```

- [ ] **Step 7.5: Crear `apps/api/src/prisma.service.ts`**

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

- [ ] **Step 7.6: Crear `apps/api/src/app.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
```

- [ ] **Step 7.7: Crear `apps/api/src/main.ts`**

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: process.env.WEB_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}/api`);
}
bootstrap();
```

- [ ] **Step 7.8: Crear `apps/api/.env.example`**

```bash
DATABASE_URL="postgresql://mirai:mirai_secret@localhost:5432/mirai_dev"
JWT_SECRET="change_me_64_chars_minimum"
JWT_REFRESH_SECRET="another_change_me_64_chars"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
WEB_URL="http://localhost:3000"
PORT=3001
```

- [ ] **Step 7.9: Instalar dependencias de API**

```bash
pnpm --filter @mirai/api install
```

- [ ] **Step 7.10: Verificar que compila**

```bash
pnpm --filter @mirai/api type-check
```

Expected: sin errores.

- [ ] **Step 7.11: Commit**

```bash
git add apps/api/
git commit -m "feat(api): bootstrap nestjs app with prisma service and global pipes"
```

---

## Task 8: NestJS Auth Module (Login + JWT + 2FA)

**Files:**
- Create: `apps/api/src/modules/auth/auth.module.ts`
- Create: `apps/api/src/modules/auth/auth.service.ts`
- Create: `apps/api/src/modules/auth/auth.controller.ts`
- Create: `apps/api/src/modules/auth/strategies/jwt.strategy.ts`
- Create: `apps/api/src/modules/auth/strategies/local.strategy.ts`
- Create: `apps/api/src/modules/auth/guards/jwt-auth.guard.ts`
- Create: `apps/api/src/modules/auth/guards/roles.guard.ts`
- Create: `apps/api/src/modules/auth/decorators/roles.decorator.ts`
- Create: `apps/api/src/modules/auth/decorators/current-user.decorator.ts`
- Create: `apps/api/src/modules/auth/dto/login.dto.ts`
- Create: `apps/api/src/modules/auth/dto/register.dto.ts`
- Create: `apps/api/src/modules/auth/dto/verify-2fa.dto.ts`
- Test: `apps/api/src/modules/auth/__tests__/auth.service.spec.ts`

- [ ] **Step 8.1: Escribir el test que falla — AuthService**

Crear `apps/api/src/modules/auth/__tests__/auth.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../../prisma.service';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

const mockUser = {
  id: 'user-1',
  email: 'test@test.com',
  passwordHash: '',
  name: 'Test',
  role: 'CLINICO' as const,
  organizationId: 'org-1',
  twoFactorEnabled: false,
  twoFactorSecret: null,
  isActive: true,
  failedLoginAttempts: 0,
  lockedUntil: null,
  lastLoginAt: null,
  title: null,
  registrationNumber: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AuthService', () => {
  let authService: AuthService;
  let prismaService: { user: { findUnique: jest.Mock; update: jest.Mock } };
  let jwtService: { sign: jest.Mock };

  beforeEach(async () => {
    mockUser.passwordHash = await bcrypt.hash('password123', 12);

    prismaService = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    jwtService = { sign: jest.fn().mockReturnValue('mock-token') };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    authService = module.get(AuthService);
  });

  describe('validateUser', () => {
    it('returns user without hash on valid credentials', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.user.update.mockResolvedValue({ ...mockUser, failedLoginAttempts: 0 });

      const result = await authService.validateUser('test@test.com', 'password123');

      expect(result).toBeDefined();
      expect(result).not.toHaveProperty('passwordHash');
      expect(result!.email).toBe('test@test.com');
    });

    it('throws UnauthorizedException on wrong password', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.user.update.mockResolvedValue({ ...mockUser, failedLoginAttempts: 1 });

      await expect(
        authService.validateUser('test@test.com', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.validateUser('noone@test.com', 'password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when account is locked', async () => {
      const lockedUser = { ...mockUser, lockedUntil: new Date(Date.now() + 60000) };
      prismaService.user.findUnique.mockResolvedValue(lockedUser);

      await expect(
        authService.validateUser('test@test.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('returns access token for user without 2FA', async () => {
      const result = await authService.login(mockUser as any);

      expect(result).toHaveProperty('accessToken');
      expect(result.requiresTwoFactor).toBe(false);
    });

    it('returns requiresTwoFactor=true for 2FA-enabled user', async () => {
      const user2FA = { ...mockUser, twoFactorEnabled: true, twoFactorSecret: 'secret' };
      const result = await authService.login(user2FA as any);

      expect(result.requiresTwoFactor).toBe(true);
      expect(result.accessToken).toBeUndefined();
    });
  });
});
```

- [ ] **Step 8.2: Verificar que el test falla**

```bash
pnpm --filter @mirai/api test -- --testPathPattern=auth.service.spec
```

Expected: FAIL — `AuthService` no existe.

- [ ] **Step 8.3: Crear `apps/api/src/modules/auth/dto/login.dto.ts`**

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
```

- [ ] **Step 8.4: Crear `apps/api/src/modules/auth/dto/register.dto.ts`**

```typescript
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { Role } from '@mirai/shared-types';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(12)
  password: string;

  @IsString()
  name: string;

  @IsEnum(Role)
  role: Role;

  @IsString()
  organizationId: string;
}
```

- [ ] **Step 8.5: Crear `apps/api/src/modules/auth/dto/verify-2fa.dto.ts`**

```typescript
import { IsString, Length } from 'class-validator';

export class Verify2faDto {
  @IsString()
  @Length(6, 6)
  token: string;

  @IsString()
  tempToken: string;
}
```

- [ ] **Step 8.6: Crear `apps/api/src/modules/auth/auth.service.ts`**

```typescript
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma.service';
import { Role, UserPayload } from '@mirai/shared-types';
import * as bcrypt from 'bcryptjs';
import * as speakeasy from 'speakeasy';
import { RegisterDto } from './dto/register.dto';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Cuenta bloqueada temporalmente');
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);

    if (!passwordValid) {
      const attempts = user.failedLoginAttempts + 1;
      const updateData: Record<string, unknown> = { failedLoginAttempts: attempts };

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
      }

      await this.prisma.user.update({ where: { id: user.id }, data: updateData });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    const { passwordHash, twoFactorSecret, ...safeUser } = user;
    return safeUser;
  }

  async login(user: Omit<Awaited<ReturnType<typeof this.validateUser>>, never>) {
    if ((user as any).twoFactorEnabled) {
      const tempPayload = { sub: user.id, twoFactorPending: true };
      return {
        requiresTwoFactor: true,
        tempToken: this.jwtService.sign(tempPayload, { expiresIn: '5m' }),
      };
    }

    return {
      requiresTwoFactor: false,
      accessToken: this.signAccessToken(user as any),
    };
  }

  async verifyTwoFactor(tempToken: string, totpToken: string) {
    let payload: { sub: string; twoFactorPending: boolean };
    try {
      payload = this.jwtService.verify(tempToken);
    } catch {
      throw new UnauthorizedException('Token temporal inválido');
    }

    if (!payload.twoFactorPending) throw new UnauthorizedException();

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user?.twoFactorSecret) throw new UnauthorizedException();

    const valid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: totpToken,
      window: 1,
    });

    if (!valid) throw new UnauthorizedException('Código 2FA inválido');

    const { passwordHash, twoFactorSecret, ...safeUser } = user;
    return { accessToken: this.signAccessToken(safeUser) };
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('El correo ya está registrado');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        role: dto.role as Role,
        organizationId: dto.organizationId,
      },
      select: { id: true, email: true, name: true, role: true, organizationId: true },
    });
    return user;
  }

  async setup2fa(userId: string) {
    const secret = speakeasy.generateSecret({ name: 'Mirai Neuropsia' });
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret.base32 },
    });
    return { otpauthUrl: secret.otpauth_url, secret: secret.base32 };
  }

  async confirm2fa(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret) throw new UnauthorizedException();

    const valid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!valid) throw new UnauthorizedException('Código 2FA inválido');
    await this.prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } });
    return { enabled: true };
  }

  private signAccessToken(user: { id: string; email: string; role: string; organizationId: string }): string {
    const payload: UserPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as Role,
      organizationId: user.organizationId,
      twoFactorVerified: true,
    };
    return this.jwtService.sign(payload);
  }
}
```

- [ ] **Step 8.7: Correr test para verificar que pasa**

```bash
pnpm --filter @mirai/api test -- --testPathPattern=auth.service.spec
```

Expected: PASS (5 tests passing).

- [ ] **Step 8.8: Crear `apps/api/src/modules/auth/strategies/local.strategy.ts`**

```typescript
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string) {
    return this.authService.validateUser(email, password);
  }
}
```

- [ ] **Step 8.9: Crear `apps/api/src/modules/auth/strategies/jwt.strategy.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserPayload } from '@mirai/shared-types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  async validate(payload: UserPayload) {
    return payload;
  }
}
```

- [ ] **Step 8.10: Crear `apps/api/src/modules/auth/guards/jwt-auth.guard.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

- [ ] **Step 8.11: Crear `apps/api/src/modules/auth/guards/roles.guard.ts`**

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@mirai/shared-types';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user?.role);
  }
}
```

- [ ] **Step 8.12: Crear `apps/api/src/modules/auth/decorators/roles.decorator.ts`**

```typescript
import { SetMetadata } from '@nestjs/common';
import { Role } from '@mirai/shared-types';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

- [ ] **Step 8.13: Crear `apps/api/src/modules/auth/decorators/current-user.decorator.ts`**

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserPayload } from '@mirai/shared-types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

- [ ] **Step 8.14: Crear `apps/api/src/modules/auth/auth.controller.ts`**

```typescript
import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
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

- [ ] **Step 8.15: Crear `apps/api/src/modules/auth/auth.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { PrismaService } from '../../prisma.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN ?? '15m' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy, PrismaService],
  exports: [JwtStrategy, JwtModule],
})
export class AuthModule {}
```

- [ ] **Step 8.16: Actualizar `apps/api/src/app.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
```

- [ ] **Step 8.17: Verificar compilación**

```bash
pnpm --filter @mirai/api type-check
```

Expected: sin errores.

- [ ] **Step 8.18: Commit**

```bash
git add apps/api/src/
git commit -m "feat(api): add auth module with JWT, local strategy, 2FA, and RBAC guards"
```

---

## Task 9: Next.js Web Bootstrap

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/postcss.config.mjs`
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/app/(auth)/login/page.tsx`
- Create: `apps/web/src/app/(dashboard)/layout.tsx`
- Create: `apps/web/src/app/(dashboard)/page.tsx`
- Create: `apps/web/src/lib/auth.ts`
- Create: `apps/web/src/lib/session.ts`
- Create: `apps/web/src/middleware.ts`
- Create: `apps/web/.env.example`

- [ ] **Step 9.1: Crear `apps/web/package.json`**

```json
{
  "name": "@mirai/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@mirai/shared-types": "workspace:*",
    "next": "14.2.3",
    "next-auth": "5.0.0-beta.19",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 9.2: Crear `apps/web/next.config.ts`**

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@mirai/shared-types'],
};

export default nextConfig;
```

- [ ] **Step 9.3: Crear `apps/web/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"],
      "@mirai/shared-types": ["../../packages/shared-types/src"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 9.4: Crear `apps/web/tailwind.config.ts`**

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          500: '#2563eb',
          600: '#1d4ed8',
          900: '#1e3a5f',
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 9.5: Crear `apps/web/postcss.config.mjs`**

```javascript
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
export default config;
```

- [ ] **Step 9.6: Crear `apps/web/src/lib/auth.ts`**

```typescript
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

const API_URL = process.env.API_URL ?? 'http://localhost:3001';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const res = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!res.ok) return null;

          const data = await res.json();
          if (data.requiresTwoFactor) {
            throw new Error(`2FA_REQUIRED:${data.tempToken}`);
          }

          return {
            id: data.userId,
            email: credentials.email as string,
            accessToken: data.accessToken,
          };
        } catch (error: unknown) {
          if (error instanceof Error && error.message.startsWith('2FA_REQUIRED:')) {
            throw error;
          }
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = (user as any).accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
});
```

- [ ] **Step 9.7: Crear `apps/web/src/lib/session.ts`**

```typescript
import { auth } from './auth';
import { redirect } from 'next/navigation';

export async function requireAuth() {
  const session = await auth();
  if (!session) redirect('/login');
  return session;
}
```

- [ ] **Step 9.8: Crear `apps/web/src/middleware.ts`**

```typescript
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthRoute = req.nextUrl.pathname.startsWith('/login');

  if (!isLoggedIn && !isAuthRoute) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

- [ ] **Step 9.9: Crear `apps/web/src/app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mirai — Neuropsia',
  description: 'Plataforma de informes neuropsicológicos asistidos',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}
```

- [ ] **Step 9.10: Crear `apps/web/src/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 9.11: Crear `apps/web/src/app/page.tsx`**

```tsx
import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/dashboard');
}
```

- [ ] **Step 9.12: Crear `apps/web/src/app/(auth)/login/page.tsx`**

```tsx
import { LoginForm } from './_components/login-form';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 to-brand-500">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-brand-900">Mirai</h1>
          <p className="text-gray-500 text-sm mt-1">Centro Neuropsia</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
```

- [ ] **Step 9.13: Crear `apps/web/src/app/(auth)/login/_components/login-form.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      if (result.error.includes('2FA_REQUIRED')) {
        const tempToken = result.error.split(':')[1];
        router.push(`/login/2fa?tempToken=${tempToken}`);
        return;
      }
      setError('Correo o contraseña incorrectos');
      return;
    }

    router.push('/dashboard');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Correo electrónico
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="nombre@neuropsia.cl"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Contraseña
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="••••••••"
        />
      </div>
      {error && (
        <p className="text-red-600 text-sm">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
      >
        {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
      </button>
    </form>
  );
}
```

- [ ] **Step 9.14: Crear `apps/web/src/app/(dashboard)/layout.tsx`**

```tsx
import { requireAuth } from '@/lib/session';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth();

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

- [ ] **Step 9.15: Crear `apps/web/src/app/(dashboard)/page.tsx`**

```tsx
import { requireAuth } from '@/lib/session';

export default async function DashboardPage() {
  const session = await requireAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Bienvenido</h1>
      <p className="text-gray-600">{session.user?.email}</p>
    </div>
  );
}
```

- [ ] **Step 9.16: Agregar Auth.js route handler**

Crear `apps/web/src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from '@/lib/auth';
export const { GET, POST } = handlers;
```

- [ ] **Step 9.17: Crear `apps/web/.env.example`**

```bash
NEXTAUTH_SECRET="random_32_chars_minimum_change_this"
NEXTAUTH_URL="http://localhost:3000"
API_URL="http://localhost:3001"
```

- [ ] **Step 9.18: Instalar dependencias web**

```bash
pnpm --filter @mirai/web install
```

- [ ] **Step 9.19: Verificar type-check**

```bash
pnpm --filter @mirai/web type-check
```

Expected: sin errores.

- [ ] **Step 9.20: Commit**

```bash
git add apps/web/
git commit -m "feat(web): bootstrap next.js app with auth.js, login page, and dashboard layout"
```

---

## Task 10: Levantar todo y verificar integración

- [ ] **Step 10.1: Crear `.env` para web (desde .env.example)**

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
```

Completar `JWT_SECRET` y `NEXTAUTH_SECRET` con strings aleatorios de 64+ chars.

- [ ] **Step 10.2: Levantar la API**

```bash
pnpm --filter @mirai/api dev
```

En terminal separado. Expected: `API running on http://localhost:3001/api`.

- [ ] **Step 10.3: Levantar el frontend**

```bash
pnpm --filter @mirai/web dev
```

En terminal separado. Expected: `ready on http://localhost:3000`.

- [ ] **Step 10.4: Probar flujo de login**

1. Abrir `http://localhost:3000` → debe redirigir a `/login`
2. Ingresar `admin@neuropsia.cl` / `ChangeMeNow2024!`
3. Debe redirigir a `/dashboard`
4. Verificar que muestra email del usuario

- [ ] **Step 10.5: Probar endpoint de API directamente**

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@neuropsia.cl","password":"ChangeMeNow2024!"}'
```

Expected: `{"requiresTwoFactor":false,"accessToken":"eyJ..."}`

- [ ] **Step 10.6: Commit final**

```bash
git add .
git commit -m "chore: verify full auth flow integration — foundation complete"
```

---

## Self-Review

**Cobertura del spec (Roadmap MVP Step 1):**
- [x] Monorepo pnpm + Turborepo
- [x] Prisma schema con TODAS las entidades del CLAUDE.md
- [x] Auth con bcrypt rounds=12 (requisito de seguridad)
- [x] 2FA obligatorio para admins (speakeasy TOTP)
- [x] Bloqueo por intentos fallidos (5 intentos → 15min lock)
- [x] RBAC completo (5 roles, guards, decorator)
- [x] JWT con expiración + 2FA pending flow
- [x] Docker Compose PostgreSQL 16
- [x] Seed: 2 frameworks + 15 instrumentos + admin inicial
- [x] Next.js App Router + Auth.js v5 + login UI
- [x] Middleware de protección de rutas

**Decisiones pendientes del spec que NO afectan esta etapa:**
- Editor rich text (TipTap) → Plan 7
- Catálogo diagnósticos → Plan 3
- Cálculo de descriptores → Plan 5

**Próximo plan:** `2026-05-30-patients-and-report-lifecycle.md` — CRUD pacientes + máquina de estados.
