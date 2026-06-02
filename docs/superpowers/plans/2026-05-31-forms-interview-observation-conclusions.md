# Paso 3 — Formularios: Antecedentes, Conducta y Conclusiones

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar los formularios de ingreso clínico para Antecedentes (InterviewForm), Conducta Observada (ObservationChecklist) y Conclusiones (ClinicalConclusion), incluyendo catálogo DSM-5-TR y prellenado determinista del Bloque 1.

**Architecture:** Cuatro módulos NestJS independientes (interview, observation, conclusion, diagnostic-codes) que leen/escriben sus propias tablas Prisma. La autorización comparte un helper `checkEditAccess` añadido a `ReportsService`. El frontend agrega tres páginas client-component bajo `/reports/[id]/{interview,observation,conclusions}`.

**Tech Stack:** NestJS + Prisma (PostgreSQL) + Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui

---

## Mapa de archivos

### Crear (API)
- `apps/api/src/modules/interview/interview.module.ts`
- `apps/api/src/modules/interview/interview.service.ts`
- `apps/api/src/modules/interview/interview.controller.ts`
- `apps/api/src/modules/interview/dto/upsert-interview.dto.ts`
- `apps/api/src/modules/interview/__tests__/interview.service.spec.ts`
- `apps/api/src/modules/observation/observation.module.ts`
- `apps/api/src/modules/observation/observation.service.ts`
- `apps/api/src/modules/observation/observation.controller.ts`
- `apps/api/src/modules/observation/dto/upsert-observation.dto.ts`
- `apps/api/src/modules/observation/__tests__/observation.service.spec.ts`
- `apps/api/src/modules/conclusion/conclusion.module.ts`
- `apps/api/src/modules/conclusion/conclusion.service.ts`
- `apps/api/src/modules/conclusion/conclusion.controller.ts`
- `apps/api/src/modules/conclusion/dto/upsert-conclusion.dto.ts`
- `apps/api/src/modules/conclusion/__tests__/conclusion.service.spec.ts`
- `apps/api/src/modules/diagnostic-codes/diagnostic-codes.module.ts`
- `apps/api/src/modules/diagnostic-codes/diagnostic-codes.service.ts`
- `apps/api/src/modules/diagnostic-codes/diagnostic-codes.controller.ts`
- `apps/api/src/modules/diagnostic-codes/__tests__/diagnostic-codes.service.spec.ts`
- `prisma/seed/04-diagnostic-codes.ts`

### Modificar (API)
- `prisma/schema.prisma` — nuevos modelos y campos
- `apps/api/src/modules/reports/reports.service.ts` — añadir `checkEditAccess`
- `apps/api/src/modules/reports/reports.module.ts` — exportar ReportsService
- `apps/api/src/app.module.ts` — registrar 4 módulos nuevos

### Crear (Web)
- `apps/web/src/app/(dashboard)/reports/[id]/interview/page.tsx`
- `apps/web/src/app/(dashboard)/reports/[id]/interview/_components/interview-form.tsx`
- `apps/web/src/app/(dashboard)/reports/[id]/observation/page.tsx`
- `apps/web/src/app/(dashboard)/reports/[id]/observation/_components/observation-checklist.tsx`
- `apps/web/src/app/(dashboard)/reports/[id]/conclusions/page.tsx`
- `apps/web/src/app/(dashboard)/reports/[id]/conclusions/_components/conclusions-form.tsx`
- `apps/web/src/app/(dashboard)/reports/[id]/conclusions/_components/hypothesis-editor.tsx`

### Modificar (Web)
- `apps/web/src/lib/api-client.ts` — tipos y métodos nuevos
- `apps/web/src/app/(dashboard)/reports/[id]/_components/section-list.tsx` — links a páginas

---

## Task 1: Schema Prisma — nuevos modelos y campos

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Editar schema.prisma**

Añadir al final de la sección de enums (después de `AccessRequestStatus`):

```prisma
enum DiagnosticStatus {
  PROVISIONAL
  CONFIRMED
  RULE_OUT
}
```

Modificar el modelo `Organization` añadiendo antes del cierre `}`:
```prisma
  closingNoteTemplate String?
```

Reemplazar el modelo `ClinicalConclusion` completo:
```prisma
model ClinicalConclusion {
  id                   String    @id @default(cuid())
  reportId             String    @unique
  content              String    @default("")
  aiDraft              String?
  processNarrative     String?
  cognitiveImpact      String?
  emotionalNote        String?
  includeEmotionalNote Boolean   @default(false)
  closingNote          String?
  approvedAt           DateTime?
  approvedBy           String?

  report     Report                 @relation(fields: [reportId], references: [id])
  hypotheses DiagnosticHypothesis[]
}
```

Reemplazar el modelo `DiagnosticHypothesis` completo:
```prisma
model DiagnosticHypothesis {
  id           String           @id @default(cuid())
  conclusionId String
  dxCode       String
  dxName       String
  specifiers   String[]
  justification String?
  status       DiagnosticStatus @default(PROVISIONAL)
  orderIndex   Int              @default(0)

  conclusion ClinicalConclusion @relation(fields: [conclusionId], references: [id], onDelete: Cascade)
  dx         DiagnosticCode     @relation(fields: [dxCode], references: [code])
}
```

Añadir modelo nuevo `DiagnosticCode` antes del bloque `// ─── PDF Import`:
```prisma
// ─── Diagnostic Codes ────────────────────────────────────────────────────────

model DiagnosticCode {
  code       String   @id
  name       String
  category   String
  specifiers String[]
  isActive   Boolean  @default(true)

  hypotheses DiagnosticHypothesis[]
}
```

- [ ] **Step 2: Generar y aplicar migración**

Desde el directorio raíz del proyecto:
```bash
cd apps/api && npx prisma migrate dev --name step3_forms_and_diagnostic_codes --schema ../../prisma/schema.prisma
```

Salida esperada: `Your database is now in sync with your schema.`

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(schema): add DiagnosticCode, extend ClinicalConclusion and DiagnosticHypothesis for step 3"
```

---

## Task 2: Seed de códigos DSM-5-TR

**Files:**
- Create: `prisma/seed/04-diagnostic-codes.ts`
- Modify: `prisma/seed/index.ts`

- [ ] **Step 1: Crear el archivo de seed**

```typescript
import { PrismaClient } from '@prisma/client';

const CODES = [
  // Neurodesarrollo
  { code: 'F84.0', name: 'Trastorno del Espectro Autista', category: 'Trastornos del Neurodesarrollo', specifiers: ['Con discapacidad intelectual acompañante', 'Sin discapacidad intelectual acompañante', 'Con deterioro del lenguaje', 'Sin deterioro del lenguaje', 'Asociado a afección médica o genética conocida', 'Con catatonía'] },
  { code: 'F90.0', name: 'TDAH presentación combinada', category: 'Trastornos del Neurodesarrollo', specifiers: ['Leve', 'Moderado', 'Grave', 'En remisión parcial'] },
  { code: 'F90.1', name: 'TDAH presentación predominantemente inatenta', category: 'Trastornos del Neurodesarrollo', specifiers: ['Leve', 'Moderado', 'Grave', 'En remisión parcial'] },
  { code: 'F90.2', name: 'TDAH presentación predominantemente hiperactiva-impulsiva', category: 'Trastornos del Neurodesarrollo', specifiers: ['Leve', 'Moderado', 'Grave', 'En remisión parcial'] },
  { code: 'F70', name: 'Discapacidad intelectual leve', category: 'Trastornos del Neurodesarrollo', specifiers: ['Con leve deterioro del comportamiento', 'Sin perturbación del comportamiento'] },
  { code: 'F71', name: 'Discapacidad intelectual moderada', category: 'Trastornos del Neurodesarrollo', specifiers: [] },
  { code: 'F72', name: 'Discapacidad intelectual grave', category: 'Trastornos del Neurodesarrollo', specifiers: [] },
  { code: 'F73', name: 'Discapacidad intelectual profunda', category: 'Trastornos del Neurodesarrollo', specifiers: [] },
  { code: 'F80.0', name: 'Trastorno de la articulación (fonológico)', category: 'Trastornos del Neurodesarrollo', specifiers: [] },
  { code: 'F80.1', name: 'Trastorno del lenguaje', category: 'Trastornos del Neurodesarrollo', specifiers: [] },
  { code: 'F80.89', name: 'Trastorno de la comunicación social (pragmático)', category: 'Trastornos del Neurodesarrollo', specifiers: [] },
  { code: 'F80.81', name: 'Trastorno de la fluidez de inicio en la infancia (tartamudeo)', category: 'Trastornos del Neurodesarrollo', specifiers: [] },
  { code: 'F81.0', name: 'Trastorno específico del aprendizaje con dificultad en la lectura', category: 'Trastornos del Neurodesarrollo', specifiers: ['Leve', 'Moderado', 'Grave', 'Con dificultades en precisión lectora', 'Con dificultades en comprensión lectora'] },
  { code: 'F81.2', name: 'Trastorno específico del aprendizaje con dificultad en las matemáticas', category: 'Trastornos del Neurodesarrollo', specifiers: ['Leve', 'Moderado', 'Grave'] },
  { code: 'F81.81', name: 'Trastorno específico del aprendizaje con dificultad en la expresión escrita', category: 'Trastornos del Neurodesarrollo', specifiers: ['Leve', 'Moderado', 'Grave'] },
  { code: 'F82', name: 'Trastorno del desarrollo de la coordinación (TAC/DCD)', category: 'Trastornos del Neurodesarrollo', specifiers: [] },
  { code: 'F95.0', name: 'Trastorno de tics provisional', category: 'Trastornos del Neurodesarrollo', specifiers: [] },
  { code: 'F95.1', name: 'Trastorno de tics motores o vocales crónicos persistentes', category: 'Trastornos del Neurodesarrollo', specifiers: ['Solo motor', 'Solo vocal'] },
  { code: 'F95.2', name: 'Síndrome de Tourette', category: 'Trastornos del Neurodesarrollo', specifiers: [] },
  // Ansiedad
  { code: 'F41.1', name: 'Trastorno de ansiedad generalizada', category: 'Trastornos de Ansiedad', specifiers: [] },
  { code: 'F40.10', name: 'Trastorno de ansiedad social (fobia social)', category: 'Trastornos de Ansiedad', specifiers: ['Solo actuación'] },
  { code: 'F40.218', name: 'Fobia específica a animales', category: 'Trastornos de Ansiedad', specifiers: [] },
  { code: 'F40.228', name: 'Fobia específica a entorno natural', category: 'Trastornos de Ansiedad', specifiers: [] },
  { code: 'F40.230', name: 'Fobia específica a sangre', category: 'Trastornos de Ansiedad', specifiers: [] },
  { code: 'F40.248', name: 'Fobia específica situacional', category: 'Trastornos de Ansiedad', specifiers: [] },
  { code: 'F41.0', name: 'Trastorno de pánico', category: 'Trastornos de Ansiedad', specifiers: [] },
  { code: 'F93.0', name: 'Trastorno de ansiedad por separación', category: 'Trastornos de Ansiedad', specifiers: [] },
  { code: 'F94.0', name: 'Mutismo selectivo', category: 'Trastornos de Ansiedad', specifiers: [] },
  { code: 'F40.00', name: 'Agorafobia', category: 'Trastornos de Ansiedad', specifiers: [] },
  // Depresivos
  { code: 'F32.0', name: 'Trastorno depresivo mayor, episodio único leve', category: 'Trastornos Depresivos', specifiers: [] },
  { code: 'F32.1', name: 'Trastorno depresivo mayor, episodio único moderado', category: 'Trastornos Depresivos', specifiers: [] },
  { code: 'F32.2', name: 'Trastorno depresivo mayor, episodio único grave sin características psicóticas', category: 'Trastornos Depresivos', specifiers: [] },
  { code: 'F32.3', name: 'Trastorno depresivo mayor, episodio único grave con características psicóticas', category: 'Trastornos Depresivos', specifiers: [] },
  { code: 'F33.0', name: 'Trastorno depresivo mayor recurrente, episodio leve', category: 'Trastornos Depresivos', specifiers: [] },
  { code: 'F33.1', name: 'Trastorno depresivo mayor recurrente, episodio moderado', category: 'Trastornos Depresivos', specifiers: [] },
  { code: 'F33.2', name: 'Trastorno depresivo mayor recurrente, episodio grave', category: 'Trastornos Depresivos', specifiers: [] },
  { code: 'F34.1', name: 'Trastorno depresivo persistente (distimia)', category: 'Trastornos Depresivos', specifiers: ['Inicio temprano', 'Inicio tardío', 'Con síndrome distímico puro', 'Con episodio depresivo mayor persistente'] },
  { code: 'F34.8', name: 'Trastorno disruptivo del estado de ánimo con desregulación emocional', category: 'Trastornos Depresivos', specifiers: [] },
  // Trauma y Estrés
  { code: 'F43.10', name: 'Trastorno de estrés postraumático', category: 'Trauma y Estrés', specifiers: ['Con síntomas disociativos', 'Con expresión retardada'] },
  { code: 'F43.0', name: 'Trastorno de estrés agudo', category: 'Trauma y Estrés', specifiers: [] },
  { code: 'F43.21', name: 'Trastorno adaptativo con estado de ánimo depresivo', category: 'Trauma y Estrés', specifiers: [] },
  { code: 'F43.22', name: 'Trastorno adaptativo con ansiedad', category: 'Trauma y Estrés', specifiers: [] },
  { code: 'F43.23', name: 'Trastorno adaptativo mixto ansioso-depresivo', category: 'Trauma y Estrés', specifiers: [] },
  { code: 'F43.24', name: 'Trastorno adaptativo con perturbación de la conducta', category: 'Trauma y Estrés', specifiers: [] },
  { code: 'F94.1', name: 'Trastorno de apego reactivo', category: 'Trauma y Estrés', specifiers: [] },
  // TOC y Relacionados
  { code: 'F42.2', name: 'Trastorno obsesivo-compulsivo', category: 'TOC y Relacionados', specifiers: ['Con introspección buena o aceptable', 'Con introspección escasa', 'Sin introspección/con creencias delirantes', 'Con antecedentes de tics'] },
  { code: 'F63.3', name: 'Tricotilomanía (trastorno de arrancarse el cabello)', category: 'TOC y Relacionados', specifiers: [] },
  { code: 'L98.1', name: 'Trastorno de excoriación (pellizcarse la piel)', category: 'TOC y Relacionados', specifiers: [] },
  { code: 'F45.22', name: 'Trastorno dismórfico corporal', category: 'TOC y Relacionados', specifiers: ['Con introspección buena o aceptable', 'Con introspección escasa', 'Sin introspección/con creencias delirantes', 'Con dismorfia muscular'] },
  // Conducta
  { code: 'F91.3', name: 'Trastorno negativista desafiante (TOD)', category: 'Trastornos de la Conducta', specifiers: ['Leve', 'Moderado', 'Grave'] },
  { code: 'F91.1', name: 'Trastorno de conducta tipo de inicio en la infancia', category: 'Trastornos de la Conducta', specifiers: ['Leve', 'Moderado', 'Grave', 'Con emociones prosociales limitadas'] },
  { code: 'F91.2', name: 'Trastorno de conducta tipo de inicio en la adolescencia', category: 'Trastornos de la Conducta', specifiers: ['Leve', 'Moderado', 'Grave', 'Con emociones prosociales limitadas'] },
  { code: 'F63.81', name: 'Trastorno explosivo intermitente', category: 'Trastornos de la Conducta', specifiers: [] },
  // Bipolar
  { code: 'F31.0', name: 'Trastorno bipolar I, episodio maníaco actual o más reciente', category: 'Trastornos Bipolares', specifiers: ['Leve', 'Moderado', 'Grave', 'Con características psicóticas'] },
  { code: 'F31.81', name: 'Trastorno bipolar II', category: 'Trastornos Bipolares', specifiers: ['Episodio hipomaníaco actual', 'Episodio depresivo actual'] },
  { code: 'F34.0', name: 'Trastorno ciclotímico', category: 'Trastornos Bipolares', specifiers: [] },
  // Sueño
  { code: 'G47.00', name: 'Insomnio crónico', category: 'Trastornos del Sueño', specifiers: [] },
  { code: 'G47.10', name: 'Hipersomnia', category: 'Trastornos del Sueño', specifiers: [] },
  // Neurocognitivos
  { code: 'G31.84', name: 'Trastorno neurocognitivo leve (TCL)', category: 'Trastornos Neurocognitivos', specifiers: ['Sin perturbación del comportamiento', 'Con perturbación del comportamiento'] },
  { code: 'F02.80', name: 'Trastorno neurocognitivo mayor sin perturbación del comportamiento', category: 'Trastornos Neurocognitivos', specifiers: [] },
  { code: 'F02.81', name: 'Trastorno neurocognitivo mayor con perturbación del comportamiento', category: 'Trastornos Neurocognitivos', specifiers: [] },
  // Espectro Esquizofrénico
  { code: 'F20.9', name: 'Esquizofrenia', category: 'Trastornos del Espectro Esquizofrénico', specifiers: [] },
  { code: 'F25.0', name: 'Trastorno esquizoafectivo tipo bipolar', category: 'Trastornos del Espectro Esquizofrénico', specifiers: [] },
  { code: 'F25.1', name: 'Trastorno esquizoafectivo tipo depresivo', category: 'Trastornos del Espectro Esquizofrénico', specifiers: [] },
  { code: 'F21', name: 'Trastorno de la personalidad esquizotípica', category: 'Trastornos del Espectro Esquizofrénico', specifiers: [] },
  { code: 'F22', name: 'Trastorno delirante', category: 'Trastornos del Espectro Esquizofrénico', specifiers: [] },
  // Otros / Sin Diagnóstico
  { code: 'Z03.89', name: 'Sin diagnóstico (descartado)', category: 'Otros / Sin Diagnóstico', specifiers: [] },
  { code: 'Z13.89', name: 'Sospecha diagnóstica (en estudio)', category: 'Otros / Sin Diagnóstico', specifiers: [] },
  { code: 'R41.3', name: 'Otras quejas cognitivas', category: 'Otros / Sin Diagnóstico', specifiers: [] },
  { code: 'R41.89', name: 'Otras quejas de cognición y percepción', category: 'Otros / Sin Diagnóstico', specifiers: [] },
  { code: 'Z55.9', name: 'Problemas relacionados con la educación y la alfabetización', category: 'Otros / Sin Diagnóstico', specifiers: [] },
];

export async function seedDiagnosticCodes(prisma: PrismaClient) {
  console.log('  Seeding diagnostic codes...');
  for (const code of CODES) {
    await prisma.diagnosticCode.upsert({
      where: { code: code.code },
      update: code,
      create: code,
    });
  }
  console.log(`  ✓ ${CODES.length} diagnostic codes seeded`);
}
```

- [ ] **Step 2: Actualizar seed/index.ts**

```typescript
import { PrismaClient } from '@prisma/client';
import { seedFrameworks } from './01-frameworks';
import { seedTestsCatalog } from './02-tests-catalog';
import { seedAdminUser } from './03-admin-user';
import { seedDiagnosticCodes } from './04-diagnostic-codes';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  await seedFrameworks(prisma);
  await seedTestsCatalog(prisma);
  await seedAdminUser(prisma);
  await seedDiagnosticCodes(prisma);
  console.log('✅ Database seeded successfully');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 3: Ejecutar seed**

```bash
cd apps/api && npx prisma db seed --schema ../../prisma/schema.prisma
```

Salida esperada: `✓ 69 diagnostic codes seeded`

- [ ] **Step 4: Commit**

```bash
git add prisma/seed/04-diagnostic-codes.ts prisma/seed/index.ts
git commit -m "feat(seed): add DSM-5-TR neuropsychological diagnostic codes"
```

---

## Task 3: Añadir `checkEditAccess` a ReportsService

**Files:**
- Modify: `apps/api/src/modules/reports/reports.service.ts`
- Modify: `apps/api/src/modules/reports/reports.module.ts`

- [ ] **Step 1: Añadir método `checkEditAccess` al final de ReportsService**

Añadir justo antes del último `}` de la clase en `reports.service.ts`:

```typescript
  async checkEditAccess(reportId: string, user: UserPayload): Promise<void> {
    const report = await this.prisma.report.findFirst({
      where: { id: reportId, organizationId: user.organizationId, deletedAt: null },
    });
    if (!report) throw new NotFoundException('Informe no encontrado');

    const locked = ['APPROVED', 'EXPORTED', 'FINAL'] as const;
    if (locked.includes(report.status as any)) {
      throw new ForbiddenException('El informe no puede ser modificado en su estado actual');
    }

    const isAuthor = report.authorId === user.sub;
    const isSupervisor = report.supervisorId === user.sub;
    if (isAuthor || isSupervisor) return;

    const grant = await this.prisma.accessGrant.findFirst({
      where: this.activeGrantWhere(user.sub),
    });
    if (!grant) throw new ForbiddenException('Sin acceso a este informe');
  }
```

Verificar que `ForbiddenException` ya está importado (lo está desde el Paso 2).

- [ ] **Step 2: Exportar ReportsService desde reports.module.ts**

El archivo ya tiene `exports: [ReportsService]`. Confirmar que existe, si no, añadirlo:

```typescript
@Module({
  controllers: [ReportsController],
  providers: [ReportsService, ReportStateMachineService, PrismaService],
  exports: [ReportsService],
})
export class ReportsModule {}
```

- [ ] **Step 3: Ejecutar tests existentes**

```bash
cd apps/api && npx jest modules/reports --no-coverage
```

Salida esperada: todos los tests del Paso 2 siguen pasando.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/reports/reports.service.ts apps/api/src/modules/reports/reports.module.ts
git commit -m "feat(reports): expose checkEditAccess helper for sub-modules"
```

---

## Task 4: InterviewService (TDD)

**Files:**
- Create: `apps/api/src/modules/interview/dto/upsert-interview.dto.ts`
- Create: `apps/api/src/modules/interview/__tests__/interview.service.spec.ts`
- Create: `apps/api/src/modules/interview/interview.service.ts`

- [ ] **Step 1: Crear DTO**

```typescript
// apps/api/src/modules/interview/dto/upsert-interview.dto.ts
import { IsObject } from 'class-validator';

export class UpsertInterviewDto {
  @IsObject()
  data: Record<string, unknown>;
}
```

- [ ] **Step 2: Escribir tests que fallan**

```typescript
// apps/api/src/modules/interview/__tests__/interview.service.spec.ts
import { InterviewService } from '../interview.service';
import { Role } from '@mirai/shared-types';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

const user: any = { sub: 'author-1', role: Role.CLINICO, organizationId: 'org-1' };
const report = { id: 'report-1', organizationId: 'org-1', authorId: 'author-1', supervisorId: null, status: 'IN_PROGRESS', deletedAt: null };
const form = { id: 'form-1', reportId: 'report-1', data: { section1: { whyConsults: 'test' } } };

function makeReportsService(reportOverride: any = report) {
  return {
    checkEditAccess: jest.fn().mockResolvedValue(undefined),
  };
}

function makePrisma(overrides: Record<string, any> = {}) {
  return {
    report: { findFirst: jest.fn().mockResolvedValue(report) },
    interviewForm: {
      findUnique: jest.fn().mockResolvedValue(form),
      upsert: jest.fn().mockResolvedValue(form),
      ...overrides.interviewForm,
    },
  };
}

describe('InterviewService', () => {
  describe('getInterview', () => {
    it('returns the interview form when it exists', async () => {
      const prisma = makePrisma();
      const rs = makeReportsService();
      const service = new InterviewService(prisma as any, rs as any);
      const result = await service.getInterview('report-1', user);
      expect(result).toEqual(form);
      expect(prisma.interviewForm.findUnique).toHaveBeenCalledWith({ where: { reportId: 'report-1' } });
    });

    it('returns null when no form exists yet', async () => {
      const prisma = makePrisma({ interviewForm: { findUnique: jest.fn().mockResolvedValue(null) } });
      const rs = makeReportsService();
      const service = new InterviewService(prisma as any, rs as any);
      const result = await service.getInterview('report-1', user);
      expect(result).toBeNull();
    });

    it('throws NotFoundException when report does not exist', async () => {
      const prisma = makePrisma();
      prisma.report.findFirst = jest.fn().mockResolvedValue(null);
      const rs = { checkEditAccess: jest.fn().mockRejectedValue(new NotFoundException()) };
      const service = new InterviewService(prisma as any, rs as any);
      await expect(service.getInterview('bad-id', user)).rejects.toThrow(NotFoundException);
    });
  });

  describe('upsertInterview', () => {
    it('upserts the interview form data', async () => {
      const prisma = makePrisma();
      const rs = makeReportsService();
      const service = new InterviewService(prisma as any, rs as any);
      const dto = { data: { section1: { whyConsults: 'dolor de cabeza' } } };
      await service.upsertInterview('report-1', dto, user);
      expect(prisma.interviewForm.upsert).toHaveBeenCalledWith({
        where: { reportId: 'report-1' },
        update: { data: dto.data },
        create: { reportId: 'report-1', data: dto.data },
      });
    });

    it('calls checkEditAccess before writing', async () => {
      const prisma = makePrisma();
      const rs = makeReportsService();
      const service = new InterviewService(prisma as any, rs as any);
      await service.upsertInterview('report-1', { data: {} }, user);
      expect(rs.checkEditAccess).toHaveBeenCalledWith('report-1', user);
    });

    it('propagates ForbiddenException from checkEditAccess', async () => {
      const prisma = makePrisma();
      const rs = { checkEditAccess: jest.fn().mockRejectedValue(new ForbiddenException()) };
      const service = new InterviewService(prisma as any, rs as any);
      await expect(service.upsertInterview('report-1', { data: {} }, user)).rejects.toThrow(ForbiddenException);
    });
  });
});
```

- [ ] **Step 3: Verificar que los tests fallan**

```bash
cd apps/api && npx jest modules/interview --no-coverage
```

Salida esperada: `Cannot find module '../interview.service'`

- [ ] **Step 4: Implementar InterviewService**

```typescript
// apps/api/src/modules/interview/interview.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ReportsService } from '../reports/reports.service';
import { UserPayload } from '@mirai/shared-types';
import { UpsertInterviewDto } from './dto/upsert-interview.dto';

@Injectable()
export class InterviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportsService: ReportsService,
  ) {}

  async getInterview(reportId: string, user: UserPayload) {
    await this.reportsService.checkEditAccess(reportId, user);
    return this.prisma.interviewForm.findUnique({ where: { reportId } });
  }

  async upsertInterview(reportId: string, dto: UpsertInterviewDto, user: UserPayload) {
    await this.reportsService.checkEditAccess(reportId, user);
    return this.prisma.interviewForm.upsert({
      where: { reportId },
      update: { data: dto.data },
      create: { reportId, data: dto.data },
    });
  }
}
```

- [ ] **Step 5: Ejecutar tests**

```bash
cd apps/api && npx jest modules/interview --no-coverage
```

Salida esperada: `5 passed`

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/interview/
git commit -m "feat(interview): add InterviewService with TDD"
```

---

## Task 5: InterviewController + Module

**Files:**
- Create: `apps/api/src/modules/interview/interview.controller.ts`
- Create: `apps/api/src/modules/interview/interview.module.ts`

- [ ] **Step 1: Crear controller**

```typescript
// apps/api/src/modules/interview/interview.controller.ts
import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserPayload } from '@mirai/shared-types';
import { InterviewService } from './interview.service';
import { UpsertInterviewDto } from './dto/upsert-interview.dto';

@Controller('reports/:id/interview')
@UseGuards(JwtAuthGuard)
export class InterviewController {
  constructor(private readonly interview: InterviewService) {}

  @Get()
  get(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.interview.getInterview(id, user);
  }

  @Put()
  upsert(@Param('id') id: string, @Body() dto: UpsertInterviewDto, @CurrentUser() user: UserPayload) {
    return this.interview.upsertInterview(id, dto, user);
  }
}
```

- [ ] **Step 2: Crear module**

```typescript
// apps/api/src/modules/interview/interview.module.ts
import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ReportsModule } from '../reports/reports.module';
import { InterviewController } from './interview.controller';
import { InterviewService } from './interview.service';

@Module({
  imports: [ReportsModule],
  controllers: [InterviewController],
  providers: [InterviewService, PrismaService],
})
export class InterviewModule {}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/interview/interview.controller.ts apps/api/src/modules/interview/interview.module.ts
git commit -m "feat(interview): add InterviewController and InterviewModule"
```

---

## Task 6: ObservationService (TDD)

**Files:**
- Create: `apps/api/src/modules/observation/dto/upsert-observation.dto.ts`
- Create: `apps/api/src/modules/observation/__tests__/observation.service.spec.ts`
- Create: `apps/api/src/modules/observation/observation.service.ts`

- [ ] **Step 1: Crear DTO**

```typescript
// apps/api/src/modules/observation/dto/upsert-observation.dto.ts
import { IsObject } from 'class-validator';

export class UpsertObservationDto {
  @IsObject()
  data: Record<string, unknown>;
}
```

- [ ] **Step 2: Escribir tests que fallan**

```typescript
// apps/api/src/modules/observation/__tests__/observation.service.spec.ts
import { ObservationService } from '../observation.service';
import { Role } from '@mirai/shared-types';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

const user: any = { sub: 'author-1', role: Role.CLINICO, organizationId: 'org-1' };
const checklist = { id: 'obs-1', reportId: 'report-1', data: { cooperacion: 0, motivacion: 1 } };

function makeReportsService() {
  return { checkEditAccess: jest.fn().mockResolvedValue(undefined) };
}

function makePrisma(overrides: Record<string, any> = {}) {
  return {
    observationChecklist: {
      findUnique: jest.fn().mockResolvedValue(checklist),
      upsert: jest.fn().mockResolvedValue(checklist),
      ...overrides.observationChecklist,
    },
  };
}

describe('ObservationService', () => {
  describe('getObservation', () => {
    it('returns the checklist when it exists', async () => {
      const prisma = makePrisma();
      const rs = makeReportsService();
      const service = new ObservationService(prisma as any, rs as any);
      const result = await service.getObservation('report-1', user);
      expect(result).toEqual(checklist);
    });

    it('returns null when no checklist exists', async () => {
      const prisma = makePrisma({ observationChecklist: { findUnique: jest.fn().mockResolvedValue(null) } });
      const rs = makeReportsService();
      const service = new ObservationService(prisma as any, rs as any);
      const result = await service.getObservation('report-1', user);
      expect(result).toBeNull();
    });

    it('throws when checkEditAccess throws', async () => {
      const prisma = makePrisma();
      const rs = { checkEditAccess: jest.fn().mockRejectedValue(new NotFoundException()) };
      const service = new ObservationService(prisma as any, rs as any);
      await expect(service.getObservation('bad', user)).rejects.toThrow(NotFoundException);
    });
  });

  describe('upsertObservation', () => {
    it('calls checkEditAccess and upserts data', async () => {
      const prisma = makePrisma();
      const rs = makeReportsService();
      const service = new ObservationService(prisma as any, rs as any);
      const dto = { data: { cooperacion: 2, nivelActividad: 'hiper' } };
      await service.upsertObservation('report-1', dto, user);
      expect(rs.checkEditAccess).toHaveBeenCalledWith('report-1', user);
      expect(prisma.observationChecklist.upsert).toHaveBeenCalledWith({
        where: { reportId: 'report-1' },
        update: { data: dto.data },
        create: { reportId: 'report-1', data: dto.data },
      });
    });

    it('propagates ForbiddenException', async () => {
      const prisma = makePrisma();
      const rs = { checkEditAccess: jest.fn().mockRejectedValue(new ForbiddenException()) };
      const service = new ObservationService(prisma as any, rs as any);
      await expect(service.upsertObservation('report-1', { data: {} }, user)).rejects.toThrow(ForbiddenException);
    });
  });
});
```

- [ ] **Step 3: Verificar que fallan**

```bash
cd apps/api && npx jest modules/observation --no-coverage
```

Salida esperada: `Cannot find module '../observation.service'`

- [ ] **Step 4: Implementar ObservationService**

```typescript
// apps/api/src/modules/observation/observation.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ReportsService } from '../reports/reports.service';
import { UserPayload } from '@mirai/shared-types';
import { UpsertObservationDto } from './dto/upsert-observation.dto';

@Injectable()
export class ObservationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportsService: ReportsService,
  ) {}

  async getObservation(reportId: string, user: UserPayload) {
    await this.reportsService.checkEditAccess(reportId, user);
    return this.prisma.observationChecklist.findUnique({ where: { reportId } });
  }

  async upsertObservation(reportId: string, dto: UpsertObservationDto, user: UserPayload) {
    await this.reportsService.checkEditAccess(reportId, user);
    return this.prisma.observationChecklist.upsert({
      where: { reportId },
      update: { data: dto.data },
      create: { reportId, data: dto.data },
    });
  }
}
```

- [ ] **Step 5: Ejecutar tests**

```bash
cd apps/api && npx jest modules/observation --no-coverage
```

Salida esperada: `4 passed`

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/observation/
git commit -m "feat(observation): add ObservationService with TDD"
```

---

## Task 7: ObservationController + Module

**Files:**
- Create: `apps/api/src/modules/observation/observation.controller.ts`
- Create: `apps/api/src/modules/observation/observation.module.ts`

- [ ] **Step 1: Crear controller**

```typescript
// apps/api/src/modules/observation/observation.controller.ts
import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserPayload } from '@mirai/shared-types';
import { ObservationService } from './observation.service';
import { UpsertObservationDto } from './dto/upsert-observation.dto';

@Controller('reports/:id/observation')
@UseGuards(JwtAuthGuard)
export class ObservationController {
  constructor(private readonly observation: ObservationService) {}

  @Get()
  get(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.observation.getObservation(id, user);
  }

  @Put()
  upsert(@Param('id') id: string, @Body() dto: UpsertObservationDto, @CurrentUser() user: UserPayload) {
    return this.observation.upsertObservation(id, dto, user);
  }
}
```

- [ ] **Step 2: Crear module**

```typescript
// apps/api/src/modules/observation/observation.module.ts
import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ReportsModule } from '../reports/reports.module';
import { ObservationController } from './observation.controller';
import { ObservationService } from './observation.service';

@Module({
  imports: [ReportsModule],
  controllers: [ObservationController],
  providers: [ObservationService, PrismaService],
})
export class ObservationModule {}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/observation/observation.controller.ts apps/api/src/modules/observation/observation.module.ts
git commit -m "feat(observation): add ObservationController and ObservationModule"
```

---

## Task 8: ConclusionService (TDD)

**Files:**
- Create: `apps/api/src/modules/conclusion/dto/upsert-conclusion.dto.ts`
- Create: `apps/api/src/modules/conclusion/__tests__/conclusion.service.spec.ts`
- Create: `apps/api/src/modules/conclusion/conclusion.service.ts`

- [ ] **Step 1: Crear DTO**

```typescript
// apps/api/src/modules/conclusion/dto/upsert-conclusion.dto.ts
import { IsBoolean, IsOptional, IsString, IsArray, ValidateNested, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum DiagnosticStatus {
  PROVISIONAL = 'PROVISIONAL',
  CONFIRMED = 'CONFIRMED',
  RULE_OUT = 'RULE_OUT',
}

export class HypothesisDto {
  @IsString()
  dxCode: string;

  @IsString()
  dxName: string;

  @IsArray()
  @IsString({ each: true })
  specifiers: string[];

  @IsOptional()
  @IsString()
  justification?: string;

  @IsEnum(DiagnosticStatus)
  status: DiagnosticStatus;

  @IsInt()
  @Min(0)
  orderIndex: number;
}

export class UpsertConclusionDto {
  @IsOptional()
  @IsString()
  processNarrative?: string;

  @IsOptional()
  @IsString()
  cognitiveImpact?: string;

  @IsOptional()
  @IsString()
  emotionalNote?: string;

  @IsOptional()
  @IsBoolean()
  includeEmotionalNote?: boolean;

  @IsOptional()
  @IsString()
  closingNote?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HypothesisDto)
  hypotheses?: HypothesisDto[];
}
```

- [ ] **Step 2: Escribir tests que fallan**

```typescript
// apps/api/src/modules/conclusion/__tests__/conclusion.service.spec.ts
import { ConclusionService } from '../conclusion.service';
import { Role } from '@mirai/shared-types';
import { ForbiddenException } from '@nestjs/common';

const user: any = { sub: 'author-1', role: Role.CLINICO, organizationId: 'org-1' };
const org = { id: 'org-1', closingNoteTemplate: 'Texto de cierre org.' };
const report = { id: 'report-1', organizationId: 'org-1', authorId: 'author-1' };

const obsData = {
  cooperacion: 0,
  motivacion: 1,
  ansiedad: 0,
  toleranciaFrustracion: 1,
  atencionSostenida: 2,
  nivelActividad: 'hiper',
  impulsividad: 1,
  fatiga: 0,
  comprensionInstrucciones: 0,
  expresionVerbal: 'fluida',
  calidadLenguaje: 0,
  contactoVisual: 0,
  reciprocidadSocial: 0,
  relacionEvaluador: 0,
  coordinacionMotora: 0,
  conductasEstereotipadas: 0,
  rigidezConductual: 0,
  additionalObservations: '',
};

const hypothesis = { id: 'h-1', conclusionId: 'c-1', dxCode: 'F90.0', dxName: 'TDAH', specifiers: [], justification: null, status: 'PROVISIONAL', orderIndex: 0 };

function makeReportsService() {
  return { checkEditAccess: jest.fn().mockResolvedValue(undefined) };
}

function makePrisma(overrides: Record<string, any> = {}) {
  const prisma: any = {
    report: { findFirst: jest.fn().mockResolvedValue(report) },
    organization: { findUnique: jest.fn().mockResolvedValue(org) },
    observationChecklist: { findUnique: jest.fn().mockResolvedValue({ data: obsData }) },
    clinicalConclusion: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({ id: 'c-1', reportId: 'report-1' }),
      update: jest.fn().mockResolvedValue({ id: 'c-1' }),
      ...overrides.clinicalConclusion,
    },
    diagnosticHypothesis: {
      deleteMany: jest.fn().mockResolvedValue({}),
      createMany: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([hypothesis]),
      ...overrides.diagnosticHypothesis,
    },
    $transaction: jest.fn().mockImplementation((fn: any) => fn(prisma)),
  };
  return prisma;
}

describe('ConclusionService', () => {
  describe('getConclusion', () => {
    it('returns null processNarrative and auto-generates it from observation when conclusion is new', async () => {
      const prisma = makePrisma();
      const rs = makeReportsService();
      const service = new ConclusionService(prisma as any, rs as any);
      const result = await service.getConclusion('report-1', user);
      expect(result.processNarrative).toBeDefined();
      expect(typeof result.processNarrative).toBe('string');
      expect(result.processNarrative!.length).toBeGreaterThan(0);
    });

    it('auto-fills closingNote from org template when conclusion has no closingNote', async () => {
      const prisma = makePrisma();
      const rs = makeReportsService();
      const service = new ConclusionService(prisma as any, rs as any);
      const result = await service.getConclusion('report-1', user);
      expect(result.closingNote).toBe('Texto de cierre org.');
    });

    it('returns existing processNarrative without overwriting', async () => {
      const existing = { id: 'c-1', reportId: 'report-1', processNarrative: 'Ya redactado.', closingNote: 'cierre', hypotheses: [] };
      const prisma = makePrisma({ clinicalConclusion: { findUnique: jest.fn().mockResolvedValue(existing) } });
      const rs = makeReportsService();
      const service = new ConclusionService(prisma as any, rs as any);
      const result = await service.getConclusion('report-1', user);
      expect(result.processNarrative).toBe('Ya redactado.');
    });
  });

  describe('upsertConclusion', () => {
    it('calls checkEditAccess before writing', async () => {
      const prisma = makePrisma();
      const rs = makeReportsService();
      const service = new ConclusionService(prisma as any, rs as any);
      await service.upsertConclusion('report-1', {}, user);
      expect(rs.checkEditAccess).toHaveBeenCalledWith('report-1', user);
    });

    it('assembles content from active blocks', async () => {
      const prisma = makePrisma();
      const rs = makeReportsService();
      const service = new ConclusionService(prisma as any, rs as any);
      const dto = {
        processNarrative: 'Bloque 1.',
        cognitiveImpact: 'Bloque 3.',
        includeEmotionalNote: true,
        emotionalNote: 'Bloque 4.',
        closingNote: 'Bloque 5.',
      };
      await service.upsertConclusion('report-1', dto, user);
      const upsertCall = prisma.clinicalConclusion.upsert.mock.calls[0][0];
      expect(upsertCall.update.content).toContain('Bloque 1.');
      expect(upsertCall.update.content).toContain('Bloque 3.');
      expect(upsertCall.update.content).toContain('Bloque 4.');
      expect(upsertCall.update.content).toContain('Bloque 5.');
    });

    it('omits emotionalNote block when includeEmotionalNote is false', async () => {
      const prisma = makePrisma();
      const rs = makeReportsService();
      const service = new ConclusionService(prisma as any, rs as any);
      const dto = {
        processNarrative: 'Bloque 1.',
        includeEmotionalNote: false,
        emotionalNote: 'No debería aparecer.',
        closingNote: 'Bloque 5.',
      };
      await service.upsertConclusion('report-1', dto, user);
      const upsertCall = prisma.clinicalConclusion.upsert.mock.calls[0][0];
      expect(upsertCall.update.content).not.toContain('No debería aparecer.');
    });

    it('replaces hypotheses list when provided', async () => {
      const prisma = makePrisma();
      const rs = makeReportsService();
      const service = new ConclusionService(prisma as any, rs as any);
      const dto = {
        hypotheses: [{ dxCode: 'F90.0', dxName: 'TDAH', specifiers: [], status: 'PROVISIONAL' as const, orderIndex: 0 }],
      };
      await service.upsertConclusion('report-1', dto, user);
      expect(prisma.diagnosticHypothesis.deleteMany).toHaveBeenCalled();
      expect(prisma.diagnosticHypothesis.createMany).toHaveBeenCalled();
    });

    it('propagates ForbiddenException', async () => {
      const prisma = makePrisma();
      const rs = { checkEditAccess: jest.fn().mockRejectedValue(new ForbiddenException()) };
      const service = new ConclusionService(prisma as any, rs as any);
      await expect(service.upsertConclusion('report-1', {}, user)).rejects.toThrow(ForbiddenException);
    });
  });
});
```

- [ ] **Step 3: Verificar que fallan**

```bash
cd apps/api && npx jest modules/conclusion --no-coverage
```

Salida esperada: `Cannot find module '../conclusion.service'`

- [ ] **Step 4: Implementar ConclusionService**

```typescript
// apps/api/src/modules/conclusion/conclusion.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ReportsService } from '../reports/reports.service';
import { UserPayload } from '@mirai/shared-types';
import { UpsertConclusionDto } from './dto/upsert-conclusion.dto';

const DEFAULT_CLOSING = 'Los resultados de esta evaluación se entregan con carácter estrictamente confidencial y deben ser interpretados en el contexto clínico integral del paciente.';

@Injectable()
export class ConclusionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportsService: ReportsService,
  ) {}

  async getConclusion(reportId: string, user: UserPayload) {
    await this.reportsService.checkEditAccess(reportId, user);

    const existing = await this.prisma.clinicalConclusion.findUnique({
      where: { reportId },
      include: { hypotheses: { orderBy: { orderIndex: 'asc' } } },
    });

    if (existing) {
      const result = { ...existing } as any;
      if (!result.closingNote) {
        result.closingNote = await this.getOrgClosingTemplate(reportId);
      }
      return result;
    }

    const processNarrative = await this.buildProcessNarrative(reportId);
    const closingNote = await this.getOrgClosingTemplate(reportId);
    return { reportId, processNarrative, closingNote, hypotheses: [], content: '', includeEmotionalNote: false };
  }

  async upsertConclusion(reportId: string, dto: UpsertConclusionDto, user: UserPayload) {
    await this.reportsService.checkEditAccess(reportId, user);

    const content = this.assembleContent(dto);

    const conclusion = await this.prisma.clinicalConclusion.upsert({
      where: { reportId },
      update: {
        content,
        processNarrative: dto.processNarrative,
        cognitiveImpact: dto.cognitiveImpact,
        emotionalNote: dto.emotionalNote,
        includeEmotionalNote: dto.includeEmotionalNote,
        closingNote: dto.closingNote,
      },
      create: {
        reportId,
        content,
        processNarrative: dto.processNarrative,
        cognitiveImpact: dto.cognitiveImpact,
        emotionalNote: dto.emotionalNote,
        includeEmotionalNote: dto.includeEmotionalNote ?? false,
        closingNote: dto.closingNote,
      },
    });

    if (dto.hypotheses !== undefined) {
      await this.prisma.diagnosticHypothesis.deleteMany({ where: { conclusionId: conclusion.id } });
      if (dto.hypotheses.length > 0) {
        await this.prisma.diagnosticHypothesis.createMany({
          data: dto.hypotheses.map((h) => ({
            conclusionId: conclusion.id,
            dxCode: h.dxCode,
            dxName: h.dxName,
            specifiers: h.specifiers,
            justification: h.justification,
            status: h.status,
            orderIndex: h.orderIndex,
          })),
        });
      }
    }

    return this.prisma.clinicalConclusion.findUnique({
      where: { reportId },
      include: { hypotheses: { orderBy: { orderIndex: 'asc' } } },
    });
  }

  private assembleContent(dto: UpsertConclusionDto): string {
    const blocks: string[] = [];
    if (dto.processNarrative) blocks.push(dto.processNarrative);
    if (dto.cognitiveImpact) blocks.push(dto.cognitiveImpact);
    if (dto.includeEmotionalNote && dto.emotionalNote) blocks.push(dto.emotionalNote);
    if (dto.closingNote) blocks.push(dto.closingNote);
    return blocks.join('\n\n');
  }

  private async buildProcessNarrative(reportId: string): Promise<string> {
    const obs = await this.prisma.observationChecklist.findUnique({ where: { reportId } });
    if (!obs) return '';
    const d = obs.data as Record<string, any>;

    const cooperacion = d.cooperacion === 0 ? 'adecuada' : d.cooperacion === 1 ? 'variable' : 'escasa';
    const motivacion = d.motivacion === 0 ? 'adecuada' : d.motivacion === 1 ? 'variable' : 'reducida';
    const nivelAct = d.nivelActividad === 'hipo' ? 'hipoactivo' : d.nivelActividad === 'hiper' ? 'hiperactivo' : 'normativo';
    const atencion = d.atencionSostenida === 0 ? 'adecuada' : d.atencionSostenida === 1 ? 'levemente reducida' : 'significativamente reducida';
    const ansiedad = d.ansiedad === 0 ? 'bajo' : d.ansiedad === 1 ? 'moderado' : 'elevado';

    return `Durante el proceso de evaluación, el/la paciente mostró una cooperación ${cooperacion} y motivación ${motivacion}. Se observó un nivel de actividad motora ${nivelAct}, con una atención sostenida ${atencion} y un nivel de ansiedad ${ansiedad}. ${d.additionalObservations ?? ''}`.trim();
  }

  private async getOrgClosingTemplate(reportId: string): Promise<string> {
    const report = await this.prisma.report.findFirst({
      where: { id: reportId },
      select: { organizationId: true },
    });
    if (!report) return DEFAULT_CLOSING;
    const org = await this.prisma.organization.findUnique({
      where: { id: report.organizationId },
      select: { closingNoteTemplate: true },
    });
    return org?.closingNoteTemplate ?? DEFAULT_CLOSING;
  }
}
```

- [ ] **Step 5: Ejecutar tests**

```bash
cd apps/api && npx jest modules/conclusion --no-coverage
```

Salida esperada: `7 passed`

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/conclusion/
git commit -m "feat(conclusion): add ConclusionService with autofill and content assembly"
```

---

## Task 9: ConclusionController + Module

**Files:**
- Create: `apps/api/src/modules/conclusion/conclusion.controller.ts`
- Create: `apps/api/src/modules/conclusion/conclusion.module.ts`

- [ ] **Step 1: Crear controller**

```typescript
// apps/api/src/modules/conclusion/conclusion.controller.ts
import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserPayload } from '@mirai/shared-types';
import { ConclusionService } from './conclusion.service';
import { UpsertConclusionDto } from './dto/upsert-conclusion.dto';

@Controller('reports/:id/conclusion')
@UseGuards(JwtAuthGuard)
export class ConclusionController {
  constructor(private readonly conclusion: ConclusionService) {}

  @Get()
  get(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.conclusion.getConclusion(id, user);
  }

  @Put()
  upsert(@Param('id') id: string, @Body() dto: UpsertConclusionDto, @CurrentUser() user: UserPayload) {
    return this.conclusion.upsertConclusion(id, dto, user);
  }
}
```

- [ ] **Step 2: Crear module**

```typescript
// apps/api/src/modules/conclusion/conclusion.module.ts
import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ReportsModule } from '../reports/reports.module';
import { ConclusionController } from './conclusion.controller';
import { ConclusionService } from './conclusion.service';

@Module({
  imports: [ReportsModule],
  controllers: [ConclusionController],
  providers: [ConclusionService, PrismaService],
})
export class ConclusionModule {}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/conclusion/conclusion.controller.ts apps/api/src/modules/conclusion/conclusion.module.ts
git commit -m "feat(conclusion): add ConclusionController and ConclusionModule"
```

---

## Task 10: DiagnosticCodesService (TDD)

**Files:**
- Create: `apps/api/src/modules/diagnostic-codes/__tests__/diagnostic-codes.service.spec.ts`
- Create: `apps/api/src/modules/diagnostic-codes/diagnostic-codes.service.ts`

- [ ] **Step 1: Escribir tests que fallan**

```typescript
// apps/api/src/modules/diagnostic-codes/__tests__/diagnostic-codes.service.spec.ts
import { DiagnosticCodesService } from '../diagnostic-codes.service';

const codes = [
  { code: 'F84.0', name: 'Trastorno del Espectro Autista', category: 'Trastornos del Neurodesarrollo', specifiers: [], isActive: true },
  { code: 'F90.0', name: 'TDAH presentación combinada', category: 'Trastornos del Neurodesarrollo', specifiers: [], isActive: true },
  { code: 'F41.1', name: 'Trastorno de ansiedad generalizada', category: 'Trastornos de Ansiedad', specifiers: [], isActive: true },
];

function makePrisma(results = codes) {
  return {
    diagnosticCode: { findMany: jest.fn().mockResolvedValue(results) },
  };
}

describe('DiagnosticCodesService', () => {
  it('returns all active codes when no filter', async () => {
    const prisma = makePrisma();
    const service = new DiagnosticCodesService(prisma as any);
    const result = await service.search({});
    expect(prisma.diagnosticCode.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isActive: true }) }),
    );
    expect(result).toHaveLength(3);
  });

  it('filters by category when provided', async () => {
    const prisma = makePrisma();
    const service = new DiagnosticCodesService(prisma as any);
    await service.search({ category: 'Trastornos de Ansiedad' });
    expect(prisma.diagnosticCode.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ category: 'Trastornos de Ansiedad' }) }),
    );
  });

  it('filters by search term in name when q provided', async () => {
    const prisma = makePrisma();
    const service = new DiagnosticCodesService(prisma as any);
    await service.search({ q: 'autista' });
    expect(prisma.diagnosticCode.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          name: expect.objectContaining({ contains: 'autista', mode: 'insensitive' }),
        }),
      }),
    );
  });
});
```

- [ ] **Step 2: Verificar que fallan**

```bash
cd apps/api && npx jest modules/diagnostic-codes --no-coverage
```

Salida esperada: `Cannot find module '../diagnostic-codes.service'`

- [ ] **Step 3: Implementar DiagnosticCodesService**

```typescript
// apps/api/src/modules/diagnostic-codes/diagnostic-codes.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class DiagnosticCodesService {
  constructor(private readonly prisma: PrismaService) {}

  search({ q, category }: { q?: string; category?: string }) {
    const where: Record<string, unknown> = { isActive: true };
    if (category) where.category = category;
    if (q) where.name = { contains: q, mode: 'insensitive' };
    return this.prisma.diagnosticCode.findMany({ where, orderBy: { code: 'asc' } });
  }
}
```

- [ ] **Step 4: Ejecutar tests**

```bash
cd apps/api && npx jest modules/diagnostic-codes --no-coverage
```

Salida esperada: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/diagnostic-codes/
git commit -m "feat(diagnostic-codes): add DiagnosticCodesService with TDD"
```

---

## Task 11: DiagnosticCodesController + Module

**Files:**
- Create: `apps/api/src/modules/diagnostic-codes/diagnostic-codes.controller.ts`
- Create: `apps/api/src/modules/diagnostic-codes/diagnostic-codes.module.ts`

- [ ] **Step 1: Crear controller**

```typescript
// apps/api/src/modules/diagnostic-codes/diagnostic-codes.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DiagnosticCodesService } from './diagnostic-codes.service';

@Controller('diagnostic-codes')
@UseGuards(JwtAuthGuard)
export class DiagnosticCodesController {
  constructor(private readonly codes: DiagnosticCodesService) {}

  @Get()
  search(@Query('q') q?: string, @Query('category') category?: string) {
    return this.codes.search({ q, category });
  }
}
```

- [ ] **Step 2: Crear module**

```typescript
// apps/api/src/modules/diagnostic-codes/diagnostic-codes.module.ts
import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { DiagnosticCodesController } from './diagnostic-codes.controller';
import { DiagnosticCodesService } from './diagnostic-codes.service';

@Module({
  controllers: [DiagnosticCodesController],
  providers: [DiagnosticCodesService, PrismaService],
})
export class DiagnosticCodesModule {}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/diagnostic-codes/diagnostic-codes.controller.ts apps/api/src/modules/diagnostic-codes/diagnostic-codes.module.ts
git commit -m "feat(diagnostic-codes): add DiagnosticCodesController and Module"
```

---

## Task 12: Registrar módulos en AppModule

**Files:**
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Actualizar app.module.ts**

Leer el archivo actual y añadir las importaciones. El resultado debe quedar así:

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
  ],
})
export class AppModule {}
```

- [ ] **Step 2: Verificar que la app compila**

```bash
cd apps/api && npx tsc --noEmit
```

Salida esperada: sin errores.

- [ ] **Step 3: Ejecutar todos los tests**

```bash
cd apps/api && npx jest --no-coverage
```

Salida esperada: todos los tests pasan (≥47 del Paso 2 + los nuevos).

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/app.module.ts
git commit -m "feat(api): register Interview, Observation, Conclusion and DiagnosticCodes modules"
```

---

## Task 13: API Client — tipos y métodos nuevos

**Files:**
- Modify: `apps/web/src/lib/api-client.ts`

- [ ] **Step 1: Añadir tipos e interfaces al final del archivo**

```typescript
// Añadir al final de apps/web/src/lib/api-client.ts

export interface InterviewData {
  section1?: { whoConsults?: string; whyConsults?: string; purposeOfEvaluation?: string };
  section2?: { householdMembers?: string; householdRelationType?: string; primaryCaregivers?: string; psychosocialContext?: string };
  section3?: { pregnancyAndBirth?: string; pregnancyDetail?: string; psychomotorMilestones?: string; milestoneDetail?: string; languageDevelopment?: string; languageDetail?: string; sphincterControl?: string };
  section4?: { childhoodBehavior?: string; childhoodSymptoms?: string; emotionalRegulationChildhood?: string; relationshipWithAuthority?: string };
  section5?: { symptomsPresist?: string; currentSymptomsDescription?: string; dailyFunctioningImpact?: string; currentTreatments?: string };
  section6?: { childhoodPeerRelations?: string; childhoodFriendships?: string; currentFriendships?: string; currentSocialNetworks?: string; hobbiesAndInterests?: string };
  section7?: { educationLevel?: string; academicPerformance?: string; gradeRepetitions?: boolean; receivedSupport?: string; workSituation?: string };
  section8?: { previousDiagnoses?: string; currentMedication?: string; hospitalizationsTraumas?: string; previousEvaluations?: string; familyMedicalHistory?: string };
}

export interface ObservationData {
  cooperacion?: number;
  motivacion?: number;
  ansiedad?: number;
  toleranciaFrustracion?: number;
  atencionSostenida?: number;
  nivelActividad?: 'hipo' | 'normo' | 'hiper';
  impulsividad?: number;
  fatiga?: number;
  comprensionInstrucciones?: number;
  expresionVerbal?: 'fluida' | 'reducida' | 'excesiva';
  calidadLenguaje?: number;
  contactoVisual?: number;
  reciprocidadSocial?: number;
  relacionEvaluador?: number;
  coordinacionMotora?: number;
  conductasEstereotipadas?: number;
  rigidezConductual?: number;
  additionalObservations?: string;
}

export interface DiagnosticCode {
  code: string;
  name: string;
  category: string;
  specifiers: string[];
}

export interface HypothesisInput {
  dxCode: string;
  dxName: string;
  specifiers: string[];
  justification?: string;
  status: 'PROVISIONAL' | 'CONFIRMED' | 'RULE_OUT';
  orderIndex: number;
}

export interface ConclusionData {
  reportId: string;
  processNarrative?: string;
  cognitiveImpact?: string;
  emotionalNote?: string;
  includeEmotionalNote: boolean;
  closingNote?: string;
  content: string;
  hypotheses: HypothesisInput[];
}

export interface UpsertConclusionInput {
  processNarrative?: string;
  cognitiveImpact?: string;
  emotionalNote?: string;
  includeEmotionalNote?: boolean;
  closingNote?: string;
  hypotheses?: HypothesisInput[];
}
```

- [ ] **Step 2: Añadir métodos al objeto apiClient**

Dentro del objeto `apiClient`, después del bloque de Reports, añadir:

```typescript
  // Interview
  getInterview: (reportId: string) =>
    apiFetch<{ data: InterviewData } | null>(`/reports/${reportId}/interview`),
  upsertInterview: (reportId: string, data: InterviewData) =>
    apiFetch<{ data: InterviewData }>(`/reports/${reportId}/interview`, {
      method: 'PUT',
      body: JSON.stringify({ data }),
    }),

  // Observation
  getObservation: (reportId: string) =>
    apiFetch<{ data: ObservationData } | null>(`/reports/${reportId}/observation`),
  upsertObservation: (reportId: string, data: ObservationData) =>
    apiFetch<{ data: ObservationData }>(`/reports/${reportId}/observation`, {
      method: 'PUT',
      body: JSON.stringify({ data }),
    }),

  // Conclusion
  getConclusion: (reportId: string) =>
    apiFetch<ConclusionData>(`/reports/${reportId}/conclusion`),
  upsertConclusion: (reportId: string, input: UpsertConclusionInput) =>
    apiFetch<ConclusionData>(`/reports/${reportId}/conclusion`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  // Diagnostic Codes
  getDiagnosticCodes: (params?: { q?: string; category?: string }) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return apiFetch<DiagnosticCode[]>(`/diagnostic-codes${qs}`);
  },
```

- [ ] **Step 3: Verificar que no hay errores TypeScript**

```bash
cd apps/web && npx tsc --noEmit
```

Salida esperada: sin errores.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/api-client.ts
git commit -m "feat(web): add interview, observation, conclusion and diagnostic-codes API client methods"
```

---

## Task 14: Página /reports/[id]/interview

**Files:**
- Create: `apps/web/src/app/(dashboard)/reports/[id]/interview/_components/interview-form.tsx`
- Create: `apps/web/src/app/(dashboard)/reports/[id]/interview/page.tsx`

- [ ] **Step 1: Crear el componente InterviewForm**

```tsx
// apps/web/src/app/(dashboard)/reports/[id]/interview/_components/interview-form.tsx
'use client';

import { useState } from 'react';
import { apiClient, InterviewData } from '@/lib/api-client';

const SECTION_LABELS = [
  'Motivo de consulta',
  'Contexto familiar',
  'Historia del desarrollo',
  'Conducta y sintomatología en la infancia',
  'Sintomatología actual',
  'Desarrollo social y hobbies',
  'Historia escolar / laboral',
  'Antecedentes médicos',
];

interface Props {
  reportId: string;
  initial: InterviewData;
}

export function InterviewForm({ reportId, initial }: Props) {
  const [data, setData] = useState<InterviewData>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function updateSection(section: keyof InterviewData, field: string, value: string | boolean) {
    setData((prev) => ({
      ...prev,
      [section]: { ...(prev[section] as any ?? {}), [field]: value },
    }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await apiClient.upsertInterview(reportId, data);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Sección 1 — Motivo de consulta */}
      <section className="border rounded-lg p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">1. {SECTION_LABELS[0]}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">¿Quién consulta?</label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={(data.section1 as any)?.whoConsults ?? ''}
              onChange={(e) => updateSection('section1', 'whoConsults', e.target.value)}
            >
              <option value="">Seleccionar</option>
              <option value="paciente">Paciente</option>
              <option value="padres">Padres / apoderados</option>
              <option value="institucion">Institución</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de consulta</label>
            <textarea
              rows={3}
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={(data.section1 as any)?.whyConsults ?? ''}
              onChange={(e) => updateSection('section1', 'whyConsults', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Propósito de la evaluación</label>
            <textarea
              rows={2}
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={(data.section1 as any)?.purposeOfEvaluation ?? ''}
              onChange={(e) => updateSection('section1', 'purposeOfEvaluation', e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Sección 2 — Contexto familiar */}
      <section className="border rounded-lg p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">2. {SECTION_LABELS[1]}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Composición del hogar</label>
            <textarea rows={2} className="w-full border rounded-md px-3 py-2 text-sm"
              value={(data.section2 as any)?.householdMembers ?? ''}
              onChange={(e) => updateSection('section2', 'householdMembers', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de relación parental</label>
            <select className="w-full border rounded-md px-3 py-2 text-sm"
              value={(data.section2 as any)?.householdRelationType ?? ''}
              onChange={(e) => updateSection('section2', 'householdRelationType', e.target.value)}>
              <option value="">Seleccionar</option>
              <option value="biparental">Biparental</option>
              <option value="monoparental">Monoparental</option>
              <option value="reconstituida">Reconstituida</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cuidadores principales</label>
            <textarea rows={2} className="w-full border rounded-md px-3 py-2 text-sm"
              value={(data.section2 as any)?.primaryCaregivers ?? ''}
              onChange={(e) => updateSection('section2', 'primaryCaregivers', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contexto psicosocial</label>
            <textarea rows={3} className="w-full border rounded-md px-3 py-2 text-sm"
              value={(data.section2 as any)?.psychosocialContext ?? ''}
              onChange={(e) => updateSection('section2', 'psychosocialContext', e.target.value)} />
          </div>
        </div>
      </section>

      {/* Secciones 3–8 con campos de texto libre */}
      {([
        ['section3', 3, SECTION_LABELS[2], [['pregnancyAndBirth', 'Embarazo y nacimiento'], ['psychomotorMilestones', 'Hitos psicomotores'], ['languageDevelopment', 'Desarrollo del lenguaje'], ['sphincterControl', 'Control de esfínteres']]],
        ['section4', 4, SECTION_LABELS[3], [['childhoodBehavior', 'Conducta en la infancia'], ['childhoodSymptoms', 'Sintomatología en la infancia'], ['emotionalRegulationChildhood', 'Regulación emocional'], ['relationshipWithAuthority', 'Relación con la autoridad']]],
        ['section5', 5, SECTION_LABELS[4], [['currentSymptomsDescription', 'Descripción síntomas actuales'], ['dailyFunctioningImpact', 'Impacto en funcionamiento diario'], ['currentTreatments', 'Tratamientos actuales']]],
        ['section6', 6, SECTION_LABELS[5], [['currentFriendships', 'Amistades actuales'], ['currentSocialNetworks', 'Redes sociales actuales'], ['hobbiesAndInterests', 'Hobbies e intereses']]],
        ['section7', 7, SECTION_LABELS[6], [['educationLevel', 'Nivel educacional'], ['receivedSupport', 'Apoyos recibidos (PIE, psicopedagogía, etc.)'], ['workSituation', 'Situación laboral (adultos)']]],
        ['section8', 8, SECTION_LABELS[7], [['previousDiagnoses', 'Diagnósticos previos'], ['currentMedication', 'Medicación actual (nombre + dosis)'], ['hospitalizationsTraumas', 'Hospitalizaciones y traumas'], ['previousEvaluations', 'Evaluaciones previas'], ['familyMedicalHistory', 'Historia médica familiar']]],
      ] as [keyof InterviewData, number, string, [string, string][]][]).map(([sectionKey, num, label, fields]) => (
        <section key={sectionKey} className="border rounded-lg p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">{num}. {label}</h3>
          <div className="space-y-4">
            {fields.map(([field, fieldLabel]) => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{fieldLabel}</label>
                <textarea rows={2} className="w-full border rounded-md px-3 py-2 text-sm"
                  value={(data[sectionKey] as any)?.[field] ?? ''}
                  onChange={(e) => updateSection(sectionKey, field, e.target.value)} />
              </div>
            ))}
          </div>
        </section>
      ))}

      <div className="flex items-center gap-4 sticky bottom-0 bg-white py-4 border-t">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-brand-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar antecedentes'}
        </button>
        {saved && <span className="text-sm text-green-600">Guardado</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Crear la page**

```tsx
// apps/web/src/app/(dashboard)/reports/[id]/interview/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { InterviewForm } from './_components/interview-form';

export default async function InterviewPage({ params }: { params: { id: string } }) {
  let initial;
  try {
    const result = await apiClient.getInterview(params.id);
    initial = result?.data ?? {};
  } catch {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/reports/${params.id}`} className="text-gray-500 hover:text-gray-700 text-sm">
          ← Volver al informe
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Antecedentes relevantes</h1>
      </div>
      <InterviewForm reportId={params.id} initial={initial} />
    </div>
  );
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd apps/web && npx tsc --noEmit
```

Salida esperada: sin errores.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/"(dashboard)"/reports/
git commit -m "feat(web): add InterviewFormPage for antecedentes"
```

---

## Task 15: Página /reports/[id]/observation

**Files:**
- Create: `apps/web/src/app/(dashboard)/reports/[id]/observation/_components/observation-checklist.tsx`
- Create: `apps/web/src/app/(dashboard)/reports/[id]/observation/page.tsx`

- [ ] **Step 1: Crear el componente ObservationChecklist**

```tsx
// apps/web/src/app/(dashboard)/reports/[id]/observation/_components/observation-checklist.tsx
'use client';

import { useState } from 'react';
import { apiClient, ObservationData } from '@/lib/api-client';

const SCALE_ITEMS: { key: keyof ObservationData; label: string; group: string }[] = [
  { key: 'cooperacion', label: 'Cooperación', group: 'Actitud y disposición' },
  { key: 'motivacion', label: 'Motivación', group: 'Actitud y disposición' },
  { key: 'ansiedad', label: 'Ansiedad', group: 'Actitud y disposición' },
  { key: 'toleranciaFrustracion', label: 'Tolerancia a la frustración', group: 'Actitud y disposición' },
  { key: 'atencionSostenida', label: 'Atención sostenida', group: 'Atención y actividad motora' },
  { key: 'impulsividad', label: 'Impulsividad', group: 'Atención y actividad motora' },
  { key: 'fatiga', label: 'Fatiga', group: 'Atención y actividad motora' },
  { key: 'comprensionInstrucciones', label: 'Comprensión de instrucciones', group: 'Comunicación y lenguaje' },
  { key: 'calidadLenguaje', label: 'Calidad del lenguaje', group: 'Comunicación y lenguaje' },
  { key: 'contactoVisual', label: 'Contacto visual', group: 'Interacción social' },
  { key: 'reciprocidadSocial', label: 'Reciprocidad social', group: 'Interacción social' },
  { key: 'relacionEvaluador', label: 'Relación con el evaluador', group: 'Interacción social' },
  { key: 'coordinacionMotora', label: 'Coordinación motora', group: 'Otros aspectos' },
  { key: 'conductasEstereotipadas', label: 'Conductas estereotipadas', group: 'Otros aspectos' },
  { key: 'rigidezConductual', label: 'Rigidez conductual', group: 'Otros aspectos' },
];

const SCALE_LABELS = ['Sin dificultad', 'Leve-moderado', 'Severo'];

interface Props {
  reportId: string;
  initial: ObservationData;
}

export function ObservationChecklist({ reportId, initial }: Props) {
  const [data, setData] = useState<ObservationData>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function set(key: keyof ObservationData, value: any) {
    setData((p) => ({ ...p, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await apiClient.upsertObservation(reportId, data);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  const groups = [...new Set(SCALE_ITEMS.map((i) => i.group))];

  return (
    <div className="space-y-8">
      {/* Ítem cualitativo: nivel de actividad */}
      <section className="border rounded-lg p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Atención y actividad motora</h3>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Nivel de actividad motora</label>
          <div className="flex gap-4">
            {(['hipo', 'normo', 'hiper'] as const).map((v) => (
              <label key={v} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="nivelActividad" value={v} checked={data.nivelActividad === v}
                  onChange={() => set('nivelActividad', v)} />
                {v === 'hipo' ? 'Hipoactivo' : v === 'normo' ? 'Normativo' : 'Hiperactivo'}
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* Ítem cualitativo: expresión verbal */}
      <section className="border rounded-lg p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Comunicación y lenguaje</h3>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Expresión verbal</label>
          <div className="flex gap-4">
            {(['fluida', 'reducida', 'excesiva'] as const).map((v) => (
              <label key={v} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="expresionVerbal" value={v} checked={data.expresionVerbal === v}
                  onChange={() => set('expresionVerbal', v)} />
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* Ítems de escala 0-1-2 por grupo */}
      {groups.map((group) => (
        <section key={group} className="border rounded-lg p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">{group}</h3>
          <div className="space-y-4">
            {SCALE_ITEMS.filter((i) => i.group === group).map(({ key, label }) => (
              <div key={key}>
                <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
                <div className="flex gap-6">
                  {SCALE_LABELS.map((sl, idx) => (
                    <label key={idx} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name={key} value={idx}
                        checked={(data[key] as number | undefined) === idx}
                        onChange={() => set(key, idx)} />
                      {sl}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Observaciones adicionales */}
      <section className="border rounded-lg p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Observaciones adicionales</h3>
        <textarea rows={4} className="w-full border rounded-md px-3 py-2 text-sm"
          value={data.additionalObservations ?? ''}
          onChange={(e) => set('additionalObservations', e.target.value)} />
      </section>

      <div className="flex items-center gap-4 sticky bottom-0 bg-white py-4 border-t">
        <button onClick={handleSave} disabled={saving}
          className="bg-brand-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
          {saving ? 'Guardando…' : 'Guardar conducta observada'}
        </button>
        {saved && <span className="text-sm text-green-600">Guardado</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Crear la page**

```tsx
// apps/web/src/app/(dashboard)/reports/[id]/observation/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { ObservationChecklist } from './_components/observation-checklist';

export default async function ObservationPage({ params }: { params: { id: string } }) {
  let initial;
  try {
    const result = await apiClient.getObservation(params.id);
    initial = result?.data ?? {};
  } catch {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/reports/${params.id}`} className="text-gray-500 hover:text-gray-700 text-sm">
          ← Volver al informe
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Conducta observada</h1>
      </div>
      <ObservationChecklist reportId={params.id} initial={initial} />
    </div>
  );
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd apps/web && npx tsc --noEmit
```

Salida esperada: sin errores.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/"(dashboard)"/reports/
git commit -m "feat(web): add ObservationChecklistPage for conducta observada"
```

---

## Task 16: Página /reports/[id]/conclusions

**Files:**
- Create: `apps/web/src/app/(dashboard)/reports/[id]/conclusions/_components/hypothesis-editor.tsx`
- Create: `apps/web/src/app/(dashboard)/reports/[id]/conclusions/_components/conclusions-form.tsx`
- Create: `apps/web/src/app/(dashboard)/reports/[id]/conclusions/page.tsx`

- [ ] **Step 1: Crear HypothesisEditor**

```tsx
// apps/web/src/app/(dashboard)/reports/[id]/conclusions/_components/hypothesis-editor.tsx
'use client';

import { useState } from 'react';
import { DiagnosticCode, HypothesisInput } from '@/lib/api-client';
import { apiClient } from '@/lib/api-client';

interface Props {
  hypotheses: HypothesisInput[];
  onChange: (h: HypothesisInput[]) => void;
}

export function HypothesisEditor({ hypotheses, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DiagnosticCode[]>([]);
  const [searching, setSearching] = useState(false);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await apiClient.getDiagnosticCodes({ q: query });
      setResults(res);
    } finally {
      setSearching(false);
    }
  }

  function addCode(code: DiagnosticCode) {
    if (hypotheses.some((h) => h.dxCode === code.code)) return;
    onChange([...hypotheses, { dxCode: code.code, dxName: code.name, specifiers: [], status: 'PROVISIONAL', orderIndex: hypotheses.length }]);
    setResults([]);
    setQuery('');
  }

  function remove(idx: number) {
    onChange(hypotheses.filter((_, i) => i !== idx).map((h, i) => ({ ...h, orderIndex: i })));
  }

  function updateHypothesis(idx: number, patch: Partial<HypothesisInput>) {
    onChange(hypotheses.map((h, i) => i === idx ? { ...h, ...patch } : h));
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Buscar código DSM-5-TR (ej: TDAH, F84.0)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1 border rounded-md px-3 py-2 text-sm"
        />
        <button onClick={handleSearch} disabled={searching}
          className="border px-4 py-2 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50">
          {searching ? '…' : 'Buscar'}
        </button>
      </div>

      {results.length > 0 && (
        <ul className="border rounded-md divide-y max-h-48 overflow-y-auto">
          {results.map((c) => (
            <li key={c.code}>
              <button onClick={() => addCode(c)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                <span className="font-mono text-gray-500 mr-2">{c.code}</span>{c.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {hypotheses.map((h, idx) => (
        <div key={h.dxCode} className="border rounded-lg p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-mono text-xs text-gray-500 mr-2">{h.dxCode}</span>
              <span className="text-sm font-medium">{h.dxName}</span>
            </div>
            <button onClick={() => remove(idx)} className="text-red-500 hover:text-red-700 text-xs">Eliminar</button>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
            <select className="border rounded px-2 py-1 text-sm"
              value={h.status}
              onChange={(e) => updateHypothesis(idx, { status: e.target.value as any })}>
              <option value="PROVISIONAL">Provisional</option>
              <option value="CONFIRMED">Confirmado</option>
              <option value="RULE_OUT">Descartado</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Justificación</label>
            <textarea rows={2} className="w-full border rounded px-2 py-1 text-sm"
              value={h.justification ?? ''}
              onChange={(e) => updateHypothesis(idx, { justification: e.target.value })} />
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Crear ConclusionsForm**

```tsx
// apps/web/src/app/(dashboard)/reports/[id]/conclusions/_components/conclusions-form.tsx
'use client';

import { useState } from 'react';
import { apiClient, ConclusionData, HypothesisInput } from '@/lib/api-client';
import { HypothesisEditor } from './hypothesis-editor';

interface Props {
  reportId: string;
  initial: ConclusionData;
}

export function ConclusionsForm({ reportId, initial }: Props) {
  const [data, setData] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function set(patch: Partial<ConclusionData>) {
    setData((p) => ({ ...p, ...patch }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const result = await apiClient.upsertConclusion(reportId, {
        processNarrative: data.processNarrative,
        cognitiveImpact: data.cognitiveImpact,
        emotionalNote: data.emotionalNote,
        includeEmotionalNote: data.includeEmotionalNote,
        closingNote: data.closingNote,
        hypotheses: data.hypotheses,
      });
      setData(result);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Bloque 1 */}
      <section className="border rounded-lg p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Bloque 1 — Resumen conductual del proceso</h3>
        <p className="text-xs text-gray-500 mb-4">Pre-llenado desde conducta observada. Edite libremente.</p>
        <textarea rows={5} className="w-full border rounded-md px-3 py-2 text-sm"
          value={data.processNarrative ?? ''}
          onChange={(e) => set({ processNarrative: e.target.value })} />
      </section>

      {/* Bloque 2 */}
      <section className="border rounded-lg p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Bloque 2 — Diagnóstico(s) con especificadores</h3>
        <HypothesisEditor
          hypotheses={data.hypotheses}
          onChange={(h: HypothesisInput[]) => set({ hypotheses: h })}
        />
      </section>

      {/* Bloque 3 */}
      <section className="border rounded-lg p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Bloque 3 — Impacto cognitivo actual</h3>
        <textarea rows={4} className="w-full border rounded-md px-3 py-2 text-sm"
          value={data.cognitiveImpact ?? ''}
          onChange={(e) => set({ cognitiveImpact: e.target.value })} />
      </section>

      {/* Bloque 4 */}
      <section className="border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Bloque 4 — Sintomatología emocional</h3>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={data.includeEmotionalNote}
              onChange={(e) => set({ includeEmotionalNote: e.target.checked })} />
            Incluir en el informe
          </label>
        </div>
        <textarea rows={4} className="w-full border rounded-md px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400"
          disabled={!data.includeEmotionalNote}
          value={data.emotionalNote ?? ''}
          onChange={(e) => set({ emotionalNote: e.target.value })} />
      </section>

      {/* Bloque 5 */}
      <section className="border rounded-lg p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Bloque 5 — Párrafo de cierre</h3>
        <p className="text-xs text-gray-500 mb-4">Pre-cargado desde plantilla de la organización.</p>
        <textarea rows={3} className="w-full border rounded-md px-3 py-2 text-sm"
          value={data.closingNote ?? ''}
          onChange={(e) => set({ closingNote: e.target.value })} />
      </section>

      <div className="flex items-center gap-4 sticky bottom-0 bg-white py-4 border-t">
        <button onClick={handleSave} disabled={saving}
          className="bg-brand-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
          {saving ? 'Guardando…' : 'Guardar conclusiones'}
        </button>
        {saved && <span className="text-sm text-green-600">Guardado</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Crear la page**

```tsx
// apps/web/src/app/(dashboard)/reports/[id]/conclusions/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { ConclusionsForm } from './_components/conclusions-form';

export default async function ConclusionsPage({ params }: { params: { id: string } }) {
  let initial;
  try {
    initial = await apiClient.getConclusion(params.id);
  } catch {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/reports/${params.id}`} className="text-gray-500 hover:text-gray-700 text-sm">
          ← Volver al informe
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Conclusiones</h1>
      </div>
      <ConclusionsForm reportId={params.id} initial={initial} />
    </div>
  );
}
```

- [ ] **Step 4: Verificar TypeScript**

```bash
cd apps/web && npx tsc --noEmit
```

Salida esperada: sin errores.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/"(dashboard)"/reports/
git commit -m "feat(web): add ConclusionsPage with hypothesis editor and block assembly"
```

---

## Task 17: Actualizar section-list con links a páginas

**Files:**
- Modify: `apps/web/src/app/(dashboard)/reports/[id]/_components/section-list.tsx`

- [ ] **Step 1: Añadir links a las tres páginas editables**

Reemplazar el archivo completo:

```tsx
import Link from 'next/link';
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

const SECTION_ROUTE: Record<string, string> = {
  BACKGROUND: 'interview',
  OBSERVED_BEHAVIOR: 'observation',
  CONCLUSIONS: 'conclusions',
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

export function SectionList({ sections, reportId }: { sections: SectionSummary[]; reportId: string }) {
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
          {sections.map((s) => {
            const route = SECTION_ROUTE[s.sectionType];
            return (
              <tr key={s.sectionType} className="hover:bg-gray-50">
                <td className="px-4 py-3">{SECTION_LABEL[s.sectionType] ?? s.sectionType}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLOR[s.status] ?? 'bg-gray-100'}`}>
                    {STATUS_LABEL[s.status] ?? s.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {route ? (
                    <Link href={`/reports/${reportId}/${route}`} className="text-brand-600 hover:underline text-xs">
                      Editar
                    </Link>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Actualizar report-overview.tsx para pasar reportId a SectionList**

En `report-overview.tsx`, cambiar `<SectionList sections={report.sections} />` por:
```tsx
<SectionList sections={report.sections} reportId={report.id} />
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd apps/web && npx tsc --noEmit
```

Salida esperada: sin errores.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/"(dashboard)"/reports/
git commit -m "feat(web): link section-list rows to interview, observation and conclusions pages"
```

---

## Verificación final

- [ ] **Ejecutar todos los tests de API**

```bash
cd apps/api && npx jest --no-coverage
```

Salida esperada: ≥55 tests pasando, 0 fallando.

- [ ] **TypeScript en ambos proyectos**

```bash
cd apps/api && npx tsc --noEmit
cd apps/web && npx tsc --noEmit
```

Salida esperada: sin errores en ninguno.

- [ ] **Commit final de verificación (si hay cambios pendientes)**

```bash
git add -A
git commit -m "test(step3): all tests passing, zero TypeScript errors"
```

---

## Spec coverage check

| Requisito spec | Task |
|---|---|
| InterviewForm — 8 secciones, datos como JSON | Tasks 4, 5, 14 |
| ObservationChecklist — escala 0-1-2, ítems cualitativos | Tasks 6, 7, 15 |
| ClinicalConclusion — 5 bloques, includeEmotionalNote | Tasks 8, 9, 16 |
| Autofill processNarrative desde checklist | Task 8 (buildProcessNarrative) |
| Prellenado closingNote desde org template | Task 8 (getOrgClosingTemplate) |
| Compilación de content al guardar | Task 8 (assembleContent) + tests |
| DiagnosticHypothesis — dxCode FK, specifiers[], status | Tasks 1, 8 |
| DiagnosticCode — catálogo ~80 códigos DSM-5-TR | Tasks 1, 2, 10, 11 |
| checkEditAccess — bloqueo en APPROVED/EXPORTED/FINAL | Task 3 |
| PUT verifica autor o supervisor | Task 3 (checkEditAccess) |
| Rutas web interview/observation/conclusions | Tasks 14, 15, 16 |
| Links desde section-list | Task 17 |
| Organization.closingNoteTemplate | Task 1 (schema) |
