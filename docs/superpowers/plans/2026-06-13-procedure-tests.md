# Procedimiento y pruebas aplicadas — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar la sección 4 "Procedimiento y pruebas aplicadas" con formulario dedicado, edición de instrumentos y generación de texto por reglas (sin IA).

**Architecture:** Módulo NestJS `ProcedureModule` con dos endpoints (GET/POST en `/reports/:id/procedure`). La lógica de generación vive en una función pura `generateProcedureText`. La página Next.js `/procedure` maneja el formulario completo, previsualización y aprobación.

**Tech Stack:** NestJS + Prisma + class-validator (backend); Next.js App Router + TypeScript (frontend); Jest (tests).

**Spec:** `docs/superpowers/specs/2026-06-13-procedure-tests-design.md`

---

## Mapa de archivos

| Acción | Ruta |
|---|---|
| Crear | `apps/api/src/modules/procedure/dto/upsert-procedure.dto.ts` |
| Crear | `apps/api/src/modules/procedure/procedure-text.ts` |
| Crear | `apps/api/src/modules/procedure/__tests__/procedure-text.spec.ts` |
| Crear | `apps/api/src/modules/procedure/procedure.service.ts` |
| Crear | `apps/api/src/modules/procedure/__tests__/procedure.service.spec.ts` |
| Crear | `apps/api/src/modules/procedure/procedure.controller.ts` |
| Crear | `apps/api/src/modules/procedure/procedure.module.ts` |
| Modificar | `apps/api/src/app.module.ts` |
| Modificar | `prisma/seed/02-tests-catalog.ts` |
| Modificar | `apps/web/src/lib/api-client.ts` |
| Crear | `apps/web/src/app/(dashboard)/reports/[id]/procedure/page.tsx` |
| Crear | `apps/web/src/app/(dashboard)/reports/[id]/procedure/_components/procedure-form.tsx` |
| Modificar | `apps/web/src/app/(dashboard)/reports/[id]/_components/section-list.tsx` |

---

## Task 1: Actualizar seed con nombres clínicos en español

**Files:**
- Modify: `prisma/seed/02-tests-catalog.ts`

- [ ] **Step 1: Reemplazar nombres en inglés por nombres clínicos en español**

En `prisma/seed/02-tests-catalog.ts`, reemplazar el array `TESTS_CATALOG` por:

```ts
const TESTS_CATALOG = [
  { code: 'WISC-V', name: 'Escala de Inteligencia de Wechsler para Niños, quinta edición (WISC-V)', abbreviation: 'WISC-V', type: 'intelligence', applicableFrameworks: ['SNP_CHC', 'STANDARD'], requiresInformant: false, orderIndex: 1 },
  { code: 'WAIS-IV', name: 'Escala de Inteligencia de Wechsler para Adultos, cuarta edición (WAIS-IV)', abbreviation: 'WAIS-IV', type: 'intelligence', applicableFrameworks: ['SNP_CHC', 'STANDARD'], requiresInformant: false, orderIndex: 2 },
  { code: 'TFCRO', name: 'Test de la Figura Compleja de Rey-Osterrieth (TFCRO)', abbreviation: 'TFCRO', type: 'cognitive', applicableFrameworks: ['SNP_CHC', 'STANDARD'], requiresInformant: false, orderIndex: 3 },
  { code: 'TAVEC', name: 'Test de Aprendizaje Verbal España-Complutense (TAVEC)', abbreviation: 'TAVEC', type: 'cognitive', applicableFrameworks: ['STANDARD'], requiresInformant: false, orderIndex: 4 },
  { code: 'TAVECI', name: 'Test de Aprendizaje Verbal España-Complutense Infantil (TAVECI)', abbreviation: 'TAVECI', type: 'cognitive', applicableFrameworks: ['SNP_CHC'], requiresInformant: false, orderIndex: 5 },
  { code: 'WCST', name: 'Wisconsin Card Sorting Test (WCST)', abbreviation: 'WCST', type: 'cognitive', applicableFrameworks: ['SNP_CHC', 'STANDARD'], requiresInformant: false, orderIndex: 6 },
  { code: 'TMT', name: 'Trail Making Test (TMT)', abbreviation: 'TMT', type: 'cognitive', applicableFrameworks: ['SNP_CHC', 'STANDARD'], requiresInformant: false, orderIndex: 7 },
  { code: 'CARAS-R', name: 'Test de Percepción de Diferencias-Revisado (CARAS-R)', abbreviation: 'CARAS-R', type: 'cognitive', applicableFrameworks: ['SNP_CHC', 'STANDARD'], requiresInformant: false, orderIndex: 8 },
  { code: 'ADOS-2', name: 'Escala de Observación para el Diagnóstico del Autismo, segunda edición (ADOS-2)', abbreviation: 'ADOS-2', type: 'social-cognition', applicableFrameworks: ['SNP_CHC'], requiresInformant: false, orderIndex: 9 },
  { code: 'ADI-R', name: 'Entrevista para el Diagnóstico del Autismo-Revisada (ADI-R)', abbreviation: 'ADI-R', type: 'social-cognition', applicableFrameworks: ['SNP_CHC'], requiresInformant: true, orderIndex: 10 },
  { code: 'BASC-3', name: 'Sistema de Evaluación de la Conducta de Niños y Adolescentes, tercera edición (BASC-3)', abbreviation: 'BASC-3', type: 'questionnaire', applicableFrameworks: ['SNP_CHC'], requiresInformant: true, orderIndex: 11 },
  { code: 'ASRS-18', name: 'Escala de Autoevaluación del TDAH en Adultos (ASRS-18)', abbreviation: 'ASRS-18', type: 'questionnaire', applicableFrameworks: ['STANDARD'], requiresInformant: false, orderIndex: 12 },
  { code: 'DEX-SP', name: 'Cuestionario Disejecutivo (DEX-Sp)', abbreviation: 'DEX-Sp', type: 'questionnaire', applicableFrameworks: ['STANDARD'], requiresInformant: false, orderIndex: 13 },
  { code: 'BAI', name: 'Inventario de Ansiedad de Beck (BAI)', abbreviation: 'BAI', type: 'questionnaire', applicableFrameworks: ['STANDARD'], requiresInformant: false, orderIndex: 14 },
  { code: 'BDI-II', name: 'Inventario de Depresión de Beck, segunda edición (BDI-II)', abbreviation: 'BDI-II', type: 'questionnaire', applicableFrameworks: ['STANDARD'], requiresInformant: false, orderIndex: 15 },
];
```

- [ ] **Step 2: Re-ejecutar seed para actualizar BD de desarrollo**

```bash
cd apps/api && npx ts-node -r tsconfig-paths/register ../../prisma/seed/index.ts
```

Expected: `✓ Tests catalog seeded (15 instruments)`

- [ ] **Step 3: Commit**

```bash
git add prisma/seed/02-tests-catalog.ts
git commit -m "fix(seed): nombres clínicos en español para los 15 instrumentos"
```

---

## Task 2: DTO del endpoint

**Files:**
- Create: `apps/api/src/modules/procedure/dto/upsert-procedure.dto.ts`

- [ ] **Step 1: Crear el DTO**

Crear `apps/api/src/modules/procedure/dto/upsert-procedure.dto.ts`:

```ts
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export enum InterviewWith {
  PARENTS = 'PARENTS',
  PATIENT = 'PATIENT',
  BOTH = 'BOTH',
  NONE = 'NONE',
}

export enum SessionModality {
  PRESENCIAL = 'PRESENCIAL',
  TELEPRESENCIAL = 'TELEPRESENCIAL',
}

export enum QuestionnaireRespondent {
  FAMILY = 'FAMILY',
  PATIENT = 'PATIENT',
  TEACHER = 'TEACHER',
  OTHER = 'OTHER',
}

export class UpsertProcedureDto {
  @IsArray()
  @IsString({ each: true })
  selectedTests!: string[];

  @IsEnum(InterviewWith)
  interviewWith!: InterviewWith;

  @IsEnum(SessionModality)
  interviewModality!: SessionModality;

  @IsEnum(SessionModality)
  adirModality!: SessionModality;

  @IsBoolean()
  questionnairesShared!: boolean;

  @IsOptional()
  @IsEnum(QuestionnaireRespondent)
  questionnaireRespondent?: QuestionnaireRespondent | null;

  @IsOptional()
  @IsString()
  questionnaireRespondentCustom?: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/procedure/
git commit -m "feat(procedure): DTO upsert-procedure"
```

---

## Task 3: Función de generación de texto (TDD)

**Files:**
- Create: `apps/api/src/modules/procedure/__tests__/procedure-text.spec.ts`
- Create: `apps/api/src/modules/procedure/procedure-text.ts`

- [ ] **Step 1: Escribir los tests (deben fallar)**

Crear `apps/api/src/modules/procedure/__tests__/procedure-text.spec.ts`:

```ts
import { generateProcedureText, ProcedureSourceData, CognitiveTestInfo } from '../procedure-text';

const cogTests: CognitiveTestInfo[] = [
  { code: 'WISC-V', name: 'Escala de Inteligencia de Wechsler para Niños, quinta edición (WISC-V)', type: 'intelligence', orderIndex: 1 },
  { code: 'TFCRO', name: 'Test de la Figura Compleja de Rey-Osterrieth (TFCRO)', type: 'cognitive', orderIndex: 3 },
];

const questTests: CognitiveTestInfo[] = [
  { code: 'BASC-3', name: 'Sistema de Evaluación de la Conducta de Niños y Adolescentes, tercera edición (BASC-3)', type: 'questionnaire', orderIndex: 11 },
];

const base: ProcedureSourceData = {
  interviewWith: 'PARENTS',
  interviewModality: 'PRESENCIAL',
  adirModality: 'PRESENCIAL',
  questionnairesShared: false,
  questionnaireRespondent: null,
  questionnaireRespondentCustom: null,
};

describe('generateProcedureText', () => {
  describe('Procedimiento — entrevista', () => {
    it('includes interview sentence for PARENTS presencial', () => {
      const text = generateProcedureText(base, 'Agustina Pérez', cogTests);
      expect(text).toContain('Se realizó entrevista con los padres de Agustina');
    });

    it('adds "telefónica" for PARENTS telepresencial', () => {
      const text = generateProcedureText({ ...base, interviewModality: 'TELEPRESENCIAL' }, 'Agustina Pérez', cogTests);
      expect(text).toContain('Se realizó entrevista telefónica con los padres de Agustina');
    });

    it('uses first name for PATIENT interviewWith', () => {
      const text = generateProcedureText({ ...base, interviewWith: 'PATIENT' }, 'Agustina Pérez', cogTests);
      expect(text).toContain('Se realizó entrevista con Agustina');
      expect(text).not.toContain('padres');
    });

    it('includes both for BOTH interviewWith', () => {
      const text = generateProcedureText({ ...base, interviewWith: 'BOTH' }, 'Agustina Pérez', cogTests);
      expect(text).toContain('Se realizó entrevista con Agustina y sus padres');
    });

    it('omits interview sentence when NONE', () => {
      const text = generateProcedureText({ ...base, interviewWith: 'NONE' }, 'Agustina Pérez', cogTests);
      expect(text).not.toContain('Se realizó entrevista');
    });
  });

  describe('Procedimiento — cuerpo y cuestionarios', () => {
    it('always includes evaluation body', () => {
      const text = generateProcedureText(base, 'Agustina Pérez', cogTests);
      expect(text).toContain('evaluación completa en Neuropsia');
      expect(text).toContain('Cada una de estas sesiones');
    });

    it('omits questionnaire paragraph when questionnairesShared is false', () => {
      const text = generateProcedureText(base, 'Agustina Pérez', cogTests);
      expect(text).not.toContain('se envió un set de cuestionarios');
    });

    it('adds questionnaire paragraph with "para la familia" for FAMILY', () => {
      const data = { ...base, questionnairesShared: true, questionnaireRespondent: 'FAMILY' as const };
      const text = generateProcedureText(data, 'Agustina Pérez', [...cogTests, ...questTests]);
      expect(text).toContain('cuestionarios para la familia');
      expect(text).toContain('devolvieron al/a la evaluador/a');
    });

    it('uses first name for PATIENT respondent', () => {
      const data = { ...base, questionnairesShared: true, questionnaireRespondent: 'PATIENT' as const };
      const text = generateProcedureText(data, 'Agustina Pérez', [...cogTests, ...questTests]);
      expect(text).toContain('cuestionarios para Agustina');
    });

    it('uses teacher phrase for TEACHER respondent', () => {
      const data = { ...base, questionnairesShared: true, questionnaireRespondent: 'TEACHER' as const };
      const text = generateProcedureText(data, 'Agustina Pérez', [...cogTests, ...questTests]);
      expect(text).toContain('para los docentes de Agustina');
    });

    it('uses custom text for OTHER respondent', () => {
      const data = { ...base, questionnairesShared: true, questionnaireRespondent: 'OTHER' as const, questionnaireRespondentCustom: 'para la abuela' };
      const text = generateProcedureText(data, 'Agustina Pérez', [...cogTests, ...questTests]);
      expect(text).toContain('cuestionarios para la abuela');
    });
  });

  describe('Pruebas aplicadas', () => {
    it('contains section header "Pruebas aplicadas"', () => {
      const text = generateProcedureText(base, 'Agustina Pérez', cogTests);
      expect(text).toContain('Pruebas aplicadas');
    });

    it('starts test list with "Entrevista clínica"', () => {
      const text = generateProcedureText(base, 'Agustina Pérez', cogTests);
      expect(text).toContain('Fueron aplicadas: Entrevista clínica.');
    });

    it('lists cognitive tests in orderIndex order', () => {
      const text = generateProcedureText(base, 'Agustina Pérez', cogTests);
      expect(text).toContain('Escala de Inteligencia de Wechsler para Niños, quinta edición (WISC-V)');
      expect(text).toContain('Test de la Figura Compleja de Rey-Osterrieth (TFCRO)');
      expect(text.indexOf('WISC-V')).toBeLessThan(text.indexOf('TFCRO'));
    });

    it('adds questionnaire paragraph when questionnaire tests are present', () => {
      const text = generateProcedureText(base, 'Agustina Pérez', [...cogTests, ...questTests]);
      expect(text).toContain('cuestionarios de valoración subjetiva');
      expect(text).toContain('Sistema de Evaluación de la Conducta de Niños y Adolescentes');
    });

    it('omits questionnaire paragraph in pruebas when no questionnaire tests', () => {
      const text = generateProcedureText(base, 'Agustina Pérez', cogTests);
      expect(text).not.toContain('cuestionarios de valoración subjetiva');
    });

    it('uses only first name for "autonomía de" phrase', () => {
      const text = generateProcedureText(base, 'Agustina Pérez', [...cogTests, ...questTests]);
      expect(text).toContain('autonomía de Agustina');
    });
  });
});
```

- [ ] **Step 2: Verificar que los tests fallan**

```bash
npx jest apps/api/src/modules/procedure/__tests__/procedure-text.spec.ts --no-coverage
```

Expected: Cannot find module `../procedure-text`

- [ ] **Step 3: Implementar la función**

Crear `apps/api/src/modules/procedure/procedure-text.ts`:

```ts
export interface CognitiveTestInfo {
  code: string;
  name: string;
  type: string;
  orderIndex: number;
}

export interface ProcedureSourceData {
  interviewWith: 'PARENTS' | 'PATIENT' | 'BOTH' | 'NONE';
  interviewModality: 'PRESENCIAL' | 'TELEPRESENCIAL';
  adirModality: 'PRESENCIAL' | 'TELEPRESENCIAL';
  questionnairesShared: boolean;
  questionnaireRespondent: 'FAMILY' | 'PATIENT' | 'TEACHER' | 'OTHER' | null;
  questionnaireRespondentCustom: string | null;
}

export function generateProcedureText(
  data: ProcedureSourceData,
  patientName: string,
  tests: CognitiveTestInfo[],
): string {
  const firstName = patientName.split(' ')[0];
  const lines: string[] = [];

  lines.push('Procedimiento');

  if (data.interviewWith !== 'NONE') {
    const prefix = data.interviewModality === 'TELEPRESENCIAL' ? 'telefónica ' : '';
    const subject =
      data.interviewWith === 'PARENTS' ? `los padres de ${firstName}` :
      data.interviewWith === 'PATIENT' ? firstName :
      `${firstName} y sus padres`;
    lines.push(
      `Se realizó entrevista ${prefix}con ${subject}, con el objetivo de indagar en antecedentes relevantes para la evaluación.`,
    );
  }

  lines.push(
    'Posteriormente, se realizó una evaluación completa en Neuropsia. Cada una de estas sesiones se enfocó en evaluar las diferentes dimensiones cognitivas a través de diversas pruebas.',
  );

  if (data.questionnairesShared && data.questionnaireRespondent) {
    const dest =
      data.questionnaireRespondent === 'FAMILY' ? 'para la familia' :
      data.questionnaireRespondent === 'PATIENT' ? `para ${firstName}` :
      data.questionnaireRespondent === 'TEACHER' ? `para los docentes de ${firstName}` :
      (data.questionnaireRespondentCustom ?? 'para el informante');
    lines.push(
      `Además, se envió un set de cuestionarios ${dest}, que buscaban obtener información sobre la conducta de ${firstName} en diversos contextos. Estos cuestionarios fueron respondidos fuera de las sesiones de evaluación y se devolvieron al/a la evaluador/a.`,
    );
  }

  lines.push('');
  lines.push('Pruebas aplicadas');
  lines.push(
    'Esta evaluación incluyó pruebas neuropsicológicas de dominio general y específico. Se privilegió el uso de pruebas actualizadas con baremos poblacionales apropiados para población chilena.',
  );

  const cogTests = tests
    .filter(t => t.type !== 'questionnaire')
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const qTests = tests
    .filter(t => t.type === 'questionnaire')
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const testList = ['Entrevista clínica', ...cogTests.map(t => t.name)];
  lines.push(`Fueron aplicadas: ${testList.join('. ')}.`);

  if (qTests.length > 0) {
    lines.push(
      `Además de lo anterior, se aplicaron cuestionarios de valoración subjetiva, con el objetivo de evaluar la presencia de sintomatología emocional, conductual y la autonomía de ${firstName}, entre las que se encuentran: ${qTests.map(t => t.name).join('. ')}.`,
    );
  }

  return lines.join('\n');
}
```

- [ ] **Step 4: Verificar que todos los tests pasan**

```bash
npx jest apps/api/src/modules/procedure/__tests__/procedure-text.spec.ts --no-coverage
```

Expected: 16 tests, all PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/procedure/
git commit -m "feat(procedure): función generateProcedureText con tests"
```

---

## Task 4: Servicio backend (TDD)

**Files:**
- Create: `apps/api/src/modules/procedure/__tests__/procedure.service.spec.ts`
- Create: `apps/api/src/modules/procedure/procedure.service.ts`

- [ ] **Step 1: Escribir tests del servicio (deben fallar)**

Crear `apps/api/src/modules/procedure/__tests__/procedure.service.spec.ts`:

```ts
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
  });
});
```

- [ ] **Step 2: Verificar que los tests fallan**

```bash
npx jest apps/api/src/modules/procedure/__tests__/procedure.service.spec.ts --no-coverage
```

Expected: Cannot find module `../procedure.service`

- [ ] **Step 3: Implementar el servicio**

Crear `apps/api/src/modules/procedure/procedure.service.ts`:

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GeneratedBy, Prisma, SectionStatus, SectionType } from '@prisma/client';
import { UserPayload } from '@mirai/shared-types';
import { PrismaService } from '../../prisma.service';
import { ReportsService } from '../reports/reports.service';
import { UpsertProcedureDto } from './dto/upsert-procedure.dto';
import { generateProcedureText, ProcedureSourceData } from './procedure-text';

@Injectable()
export class ProcedureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportsService: ReportsService,
  ) {}

  async getProcedure(reportId: string, user: UserPayload) {
    await this.reportsService.checkEditAccess(reportId, user);

    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      select: {
        selectedTests: true,
        frameworkCode: true,
        patient: { select: { name: true } },
      },
    });

    if (!report) throw new NotFoundException('Informe no encontrado');

    const section = await this.prisma.reportSection.findFirst({
      where: { reportId, sectionType: SectionType.PROCEDURE_TESTS },
      select: { content: true, status: true, sourceData: true },
    });

    return {
      selectedTests: (report.selectedTests ?? []) as string[],
      frameworkCode: report.frameworkCode,
      procedureData: section?.sourceData ?? null,
      content: section?.content ?? null,
      sectionStatus: section?.status ?? SectionStatus.PENDING,
    };
  }

  async upsertProcedure(reportId: string, dto: UpsertProcedureDto, user: UserPayload) {
    await this.reportsService.checkEditAccess(reportId, user);

    if (dto.questionnairesShared) {
      const qTests = await this.prisma.cognitiveTest.findMany({
        where: { code: { in: dto.selectedTests }, type: 'questionnaire' },
        select: { id: true },
      });
      if (qTests.length === 0) {
        throw new BadRequestException(
          'Debe seleccionar al menos un cuestionario para activar esta opción',
        );
      }
    }

    await this.prisma.report.update({
      where: { id: reportId },
      data: { selectedTests: dto.selectedTests },
    });

    const [tests, report] = await Promise.all([
      this.prisma.cognitiveTest.findMany({
        where: { code: { in: dto.selectedTests } },
        select: { code: true, name: true, type: true, orderIndex: true },
        orderBy: { orderIndex: 'asc' },
      }),
      this.prisma.report.findUnique({
        where: { id: reportId },
        select: { patient: { select: { name: true } } },
      }),
    ]);

    const procedureData: ProcedureSourceData = {
      interviewWith: dto.interviewWith,
      interviewModality: dto.interviewModality,
      adirModality: dto.adirModality,
      questionnairesShared: dto.questionnairesShared,
      questionnaireRespondent: dto.questionnaireRespondent ?? null,
      questionnaireRespondentCustom: dto.questionnaireRespondentCustom ?? null,
    };

    const content = generateProcedureText(
      procedureData,
      report?.patient?.name ?? 'el/la paciente',
      tests,
    );

    const section = await this.prisma.reportSection.findFirst({
      where: { reportId, sectionType: SectionType.PROCEDURE_TESTS },
    });

    if (!section) throw new NotFoundException('Sección no encontrada');

    const updated = await this.prisma.reportSection.update({
      where: { id: section.id },
      data: {
        content,
        sourceData: procedureData as unknown as Prisma.InputJsonValue,
        generatedBy: GeneratedBy.RULES,
        status: SectionStatus.CLINICIAN_REVIEWING,
        clinicianEdited: false,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.sub,
        action: 'SECTION_SAVED',
        resource: 'ReportSection',
        resourceId: section.id,
        metadata: { sectionType: 'PROCEDURE_TESTS', reportId } as Prisma.InputJsonValue,
      },
    });

    return {
      content: updated.content,
      status: updated.status,
      sourceData: updated.sourceData,
    };
  }
}
```

- [ ] **Step 4: Verificar que todos los tests pasan**

```bash
npx jest apps/api/src/modules/procedure/__tests__/procedure.service.spec.ts --no-coverage
```

Expected: 7 tests, all PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/procedure/
git commit -m "feat(procedure): ProcedureService con tests"
```

---

## Task 5: Controlador, módulo y registro en AppModule

**Files:**
- Create: `apps/api/src/modules/procedure/procedure.controller.ts`
- Create: `apps/api/src/modules/procedure/procedure.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Crear el controlador**

Crear `apps/api/src/modules/procedure/procedure.controller.ts`:

```ts
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserPayload } from '@mirai/shared-types';
import { ProcedureService } from './procedure.service';
import { UpsertProcedureDto } from './dto/upsert-procedure.dto';

@Controller('reports/:id/procedure')
@UseGuards(JwtAuthGuard)
export class ProcedureController {
  constructor(private readonly service: ProcedureService) {}

  @Get()
  get(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.service.getProcedure(id, user);
  }

  @Post()
  upsert(
    @Param('id') id: string,
    @Body() dto: UpsertProcedureDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.service.upsertProcedure(id, dto, user);
  }
}
```

- [ ] **Step 2: Crear el módulo**

Crear `apps/api/src/modules/procedure/procedure.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ReportsModule } from '../reports/reports.module';
import { ProcedureController } from './procedure.controller';
import { ProcedureService } from './procedure.service';

@Module({
  imports: [ReportsModule],
  controllers: [ProcedureController],
  providers: [ProcedureService, PrismaService],
  exports: [ProcedureService],
})
export class ProcedureModule {}
```

- [ ] **Step 3: Registrar en AppModule**

En `apps/api/src/app.module.ts`, agregar el import (junto a los otros módulos):

```ts
import { ProcedureModule } from './modules/procedure/procedure.module';
```

Y en el array `imports` de `@Module`, agregar `ProcedureModule` después de `AiModule`:

```ts
AiModule,
ProcedureModule,
ExportModule,
```

- [ ] **Step 4: Verificar que el API compila**

```bash
cd apps/api && npx nest build 2>&1 | tail -5
```

Expected: sin errores de TypeScript

- [ ] **Step 5: Ejecutar suite completa de tests de la API**

```bash
npx jest apps/api/src/modules/procedure/ --no-coverage
```

Expected: todos los tests pasan (23 tests en total: 16 de text + 7 de service)

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/procedure/ apps/api/src/app.module.ts
git commit -m "feat(procedure): ProcedureController, ProcedureModule, registro en AppModule"
```

---

## Task 6: Tipos y métodos en api-client

**Files:**
- Modify: `apps/web/src/lib/api-client.ts`

- [ ] **Step 1: Agregar tipos al final del archivo (después de los tipos existentes)**

En `apps/web/src/lib/api-client.ts`, al final del archivo donde están los otros tipos exportados, agregar:

```ts
export interface ProcedureData {
  selectedTests: string[];
  frameworkCode: string;
  procedureData: ProcedureSourceData | null;
  content: string | null;
  sectionStatus: string;
}

export interface ProcedureSourceData {
  interviewWith: 'PARENTS' | 'PATIENT' | 'BOTH' | 'NONE';
  interviewModality: 'PRESENCIAL' | 'TELEPRESENCIAL';
  adirModality: 'PRESENCIAL' | 'TELEPRESENCIAL';
  questionnairesShared: boolean;
  questionnaireRespondent: 'FAMILY' | 'PATIENT' | 'TEACHER' | 'OTHER' | null;
  questionnaireRespondentCustom: string | null;
}

export interface UpsertProcedureInput {
  selectedTests: string[];
  interviewWith: 'PARENTS' | 'PATIENT' | 'BOTH' | 'NONE';
  interviewModality: 'PRESENCIAL' | 'TELEPRESENCIAL';
  adirModality: 'PRESENCIAL' | 'TELEPRESENCIAL';
  questionnairesShared: boolean;
  questionnaireRespondent: 'FAMILY' | 'PATIENT' | 'TEACHER' | 'OTHER' | null;
  questionnaireRespondentCustom?: string;
}

export interface UpsertProcedureResult {
  content: string | null;
  status: string;
  sourceData: Record<string, unknown> | null;
}
```

- [ ] **Step 2: Agregar métodos al objeto `apiClient`**

En `apps/web/src/lib/api-client.ts`, dentro del objeto `apiClient` (después del bloque de `// Audit`), agregar:

```ts
  // Procedure
  getProcedure: (reportId: string) =>
    apiFetch<ProcedureData>(`/reports/${reportId}/procedure`),
  upsertProcedure: (reportId: string, input: UpsertProcedureInput) =>
    apiFetch<UpsertProcedureResult>(`/reports/${reportId}/procedure`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
```

- [ ] **Step 3: Verificar que compila**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Expected: sin errores en `api-client.ts`

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/api-client.ts
git commit -m "feat(procedure): tipos y métodos getProcedure/upsertProcedure en api-client"
```

---

## Task 7: Página del servidor y componente de formulario

**Files:**
- Create: `apps/web/src/app/(dashboard)/reports/[id]/procedure/page.tsx`
- Create: `apps/web/src/app/(dashboard)/reports/[id]/procedure/_components/procedure-form.tsx`

- [ ] **Step 1: Crear page.tsx (Server Component)**

Crear `apps/web/src/app/(dashboard)/reports/[id]/procedure/page.tsx`:

```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { ProcedureForm } from './_components/procedure-form';

export default async function ProcedurePage({ params }: { params: { id: string } }) {
  let initial;
  try {
    initial = await apiClient.getProcedure(params.id);
  } catch {
    notFound();
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/reports/${params.id}`} className="text-gray-500 hover:text-gray-700 text-sm">
          ← Volver al informe
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Procedimiento y pruebas aplicadas</h1>
      </div>
      <ProcedureForm reportId={params.id} initial={initial} />
    </div>
  );
}
```

- [ ] **Step 2: Crear procedure-form.tsx (Client Component)**

Crear `apps/web/src/app/(dashboard)/reports/[id]/procedure/_components/procedure-form.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { apiClient, ProcedureData, ProcedureSourceData, UpsertProcedureInput } from '@/lib/api-client';

interface TestOption {
  code: string;
  name: string;
  domain: string;
}

const TESTS_BY_FRAMEWORK: Record<string, TestOption[]> = {
  SNP_CHC: [
    { code: 'WISC-V', name: 'WISC-V', domain: 'Inteligencia' },
    { code: 'TFCRO', name: 'TFCRO', domain: 'Visuoespacial / Praxias' },
    { code: 'TAVECI', name: 'TAVECI', domain: 'Memoria episódica' },
    { code: 'WCST', name: 'WCST', domain: 'Funciones ejecutivas' },
    { code: 'TMT', name: 'TMT', domain: 'Funciones ejecutivas' },
    { code: 'CARAS-R', name: 'CARAS-R', domain: 'Atención' },
    { code: 'ADOS-2', name: 'ADOS-2', domain: 'Cognición social' },
    { code: 'ADI-R', name: 'ADI-R', domain: 'Cognición social' },
    { code: 'BASC-3', name: 'BASC-3', domain: 'Cuestionarios' },
  ],
  STANDARD: [
    { code: 'WAIS-IV', name: 'WAIS-IV', domain: 'Inteligencia' },
    { code: 'TFCRO', name: 'TFCRO', domain: 'Visuoespacial / Praxias' },
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

const QUESTIONNAIRE_CODES = new Set(['BASC-3', 'ASRS-18', 'DEX-Sp', 'DEX-SP', 'BAI', 'BDI-II']);

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  CLINICIAN_REVIEWING: 'En revisión',
  APPROVED: 'Aprobado',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-600',
  CLINICIAN_REVIEWING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
};

interface Props {
  reportId: string;
  initial: ProcedureData;
}

export function ProcedureForm({ reportId, initial }: Props) {
  const tests = TESTS_BY_FRAMEWORK[initial.frameworkCode] ?? TESTS_BY_FRAMEWORK['SNP_CHC'];
  const saved = initial.procedureData as ProcedureSourceData | null;

  const [selectedTests, setSelectedTests] = useState<string[]>(initial.selectedTests);
  const [interviewWith, setInterviewWith] = useState(saved?.interviewWith ?? 'PARENTS');
  const [interviewModality, setInterviewModality] = useState(saved?.interviewModality ?? 'PRESENCIAL');
  const [adirModality, setAdirModality] = useState(saved?.adirModality ?? 'PRESENCIAL');
  const [questionnairesShared, setQuestionnairesShared] = useState(saved?.questionnairesShared ?? false);
  const [questionnaireRespondent, setQuestionnaireRespondent] = useState<string | null>(saved?.questionnaireRespondent ?? null);
  const [questionnaireRespondentCustom, setQuestionnaireRespondentCustom] = useState(saved?.questionnaireRespondentCustom ?? '');
  const [content, setContent] = useState(initial.content ?? '');
  const [sectionStatus, setSectionStatus] = useState(initial.sectionStatus);

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const adirSelected = selectedTests.includes('ADI-R');
  const questionnaireTestsSelected = selectedTests.some(c => QUESTIONNAIRE_CODES.has(c));
  const isApproved = sectionStatus === 'APPROVED';

  function toggleTest(code: string) {
    setSelectedTests(prev => {
      const next = prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code];
      if (!next.some(c => QUESTIONNAIRE_CODES.has(c))) {
        setQuestionnairesShared(false);
        setQuestionnaireRespondent(null);
      }
      return next;
    });
    setMessage(null);
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setMessage(null);
    try {
      const input: UpsertProcedureInput = {
        selectedTests,
        interviewWith: interviewWith as UpsertProcedureInput['interviewWith'],
        interviewModality: interviewModality as UpsertProcedureInput['interviewModality'],
        adirModality: adirModality as UpsertProcedureInput['adirModality'],
        questionnairesShared,
        questionnaireRespondent: questionnairesShared
          ? (questionnaireRespondent as UpsertProcedureInput['questionnaireRespondent'])
          : null,
        questionnaireRespondentCustom:
          questionnaireRespondent === 'OTHER' ? questionnaireRespondentCustom : undefined,
      };
      const result = await apiClient.upsertProcedure(reportId, input);
      setContent(result.content ?? '');
      setSectionStatus(result.status);
      setMessage('Sección generada correctamente.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al generar.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveContent() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await apiClient.saveSection(reportId, 'PROCEDURE_TESTS', content);
      setSectionStatus(updated.status);
      setMessage('Cambios guardados.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove() {
    setApproving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await apiClient.approveSection(reportId, 'PROCEDURE_TESTS');
      setSectionStatus(updated.status);
      setMessage('Sección aprobada.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al aprobar.');
    } finally {
      setApproving(false);
    }
  }

  const byDomain = tests.reduce<Record<string, TestOption[]>>((acc, t) => {
    return { ...acc, [t.domain]: [...(acc[t.domain] ?? []), t] };
  }, {});

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-md">{error}</div>
      )}
      {message && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-md">{message}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Instrumentos */}
        <section className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b">
            <h3 className="font-semibold text-gray-900 text-sm">Instrumentos aplicados</h3>
          </div>
          <div className="px-4 py-4 space-y-4">
            {Object.entries(byDomain).map(([domain, items]) => (
              <div key={domain}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{domain}</p>
                <div className="space-y-2">
                  {items.map(t => (
                    <div key={t.code}>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTests.includes(t.code)}
                          onChange={() => toggleTest(t.code)}
                          disabled={isApproved}
                          className="rounded border-gray-300 text-blue-600"
                        />
                        <span className="text-sm">{t.name}</span>
                      </label>
                      {t.code === 'ADI-R' && adirSelected && (
                        <div className="ml-7 mt-1.5 flex gap-4">
                          {(['PRESENCIAL', 'TELEPRESENCIAL'] as const).map(m => (
                            <label key={m} className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                              <input
                                type="radio"
                                name="adirModality"
                                value={m}
                                checked={adirModality === m}
                                onChange={() => setAdirModality(m)}
                                disabled={isApproved}
                              />
                              {m === 'PRESENCIAL' ? 'Presencial' : 'Telepresencial'}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Procedimiento */}
        <section className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b">
            <h3 className="font-semibold text-gray-900 text-sm">Procedimiento</h3>
          </div>
          <div className="px-4 py-4 space-y-5">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Entrevista realizada con</label>
              <select
                value={interviewWith}
                onChange={e => setInterviewWith(e.target.value)}
                disabled={isApproved}
                className="w-full border rounded-md px-3 py-2 text-sm"
              >
                <option value="PARENTS">Padres / cuidadores</option>
                <option value="PATIENT">Paciente</option>
                <option value="BOTH">Paciente y padres</option>
                <option value="NONE">No se realizó</option>
              </select>
            </div>

            {interviewWith !== 'NONE' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Modalidad de la entrevista</label>
                <div className="flex gap-5">
                  {(['PRESENCIAL', 'TELEPRESENCIAL'] as const).map(m => (
                    <label key={m} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="interviewModality"
                        value={m}
                        checked={interviewModality === m}
                        onChange={() => setInterviewModality(m)}
                        disabled={isApproved}
                      />
                      {m === 'PRESENCIAL' ? 'Presencial' : 'Telepresencial'}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={questionnairesShared}
                  disabled={!questionnaireTestsSelected || isApproved}
                  onChange={e => {
                    setQuestionnairesShared(e.target.checked);
                    if (!e.target.checked) setQuestionnaireRespondent(null);
                  }}
                  className="rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm">Se enviaron cuestionarios</span>
              </label>
              {!questionnaireTestsSelected && (
                <p className="text-xs text-gray-400 mt-1 ml-7">
                  Seleccione al menos un cuestionario en la lista de instrumentos
                </p>
              )}
            </div>

            {questionnairesShared && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Respondidos por</label>
                <select
                  value={questionnaireRespondent ?? ''}
                  onChange={e => setQuestionnaireRespondent(e.target.value || null)}
                  disabled={isApproved}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar…</option>
                  <option value="FAMILY">Familia</option>
                  <option value="PATIENT">Paciente</option>
                  <option value="TEACHER">Docentes</option>
                  <option value="OTHER">Otro</option>
                </select>
              </div>
            )}

            {questionnairesShared && questionnaireRespondent === 'OTHER' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Especificar</label>
                <input
                  type="text"
                  value={questionnaireRespondentCustom}
                  onChange={e => setQuestionnaireRespondentCustom(e.target.value)}
                  disabled={isApproved}
                  placeholder="ej: para la abuela"
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>
            )}
          </div>
        </section>
      </div>

      {!isApproved && (
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-emerald-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          {generating ? 'Generando…' : 'Guardar y generar sección'}
        </button>
      )}

      {content && (
        <section className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">Texto generado</h3>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[sectionStatus] ?? 'bg-gray-100 text-gray-600'}`}>
              {STATUS_LABEL[sectionStatus] ?? sectionStatus}
            </span>
          </div>
          <div className="px-4 py-4 space-y-4">
            <textarea
              rows={16}
              readOnly={isApproved}
              className={`w-full border rounded-md px-3 py-2 text-sm leading-relaxed ${
                isApproved ? 'bg-gray-50 text-gray-700 cursor-default' : 'focus:outline-none focus:ring-1 focus:ring-blue-400'
              }`}
              value={content}
              onChange={e => { setContent(e.target.value); setMessage(null); }}
            />
            {!isApproved && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveContent}
                  disabled={saving}
                  className="bg-gray-700 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-40"
                >
                  {saving ? 'Guardando…' : 'Guardar cambios'}
                </button>
                <button
                  onClick={handleApprove}
                  disabled={approving || sectionStatus === 'PENDING'}
                  className="bg-blue-600 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-40"
                >
                  {approving ? 'Aprobando…' : 'Aprobar sección'}
                </button>
                {sectionStatus === 'PENDING' && (
                  <span className="text-xs text-gray-400">Genere la sección antes de aprobar.</span>
                )}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verificar que el frontend compila sin errores de TypeScript**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -30
```

Expected: sin errores en los archivos nuevos

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/reports/
git commit -m "feat(procedure): página y formulario /procedure"
```

---

## Task 8: Actualizar ruta en section-list y verificación final

**Files:**
- Modify: `apps/web/src/app/(dashboard)/reports/[id]/_components/section-list.tsx`

- [ ] **Step 1: Cambiar la ruta de PROCEDURE_TESTS**

En `apps/web/src/app/(dashboard)/reports/[id]/_components/section-list.tsx`, buscar:

```ts
PROCEDURE_TESTS: 'sections/PROCEDURE_TESTS',
```

Reemplazar con:

```ts
PROCEDURE_TESTS: 'procedure',
```

- [ ] **Step 2: Verificar TypeScript del frontend completo**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Expected: sin errores

- [ ] **Step 3: Ejecutar todos los tests de la API**

```bash
npx jest apps/api/src/modules/procedure/ --no-coverage --verbose
```

Expected: 23 tests pasando

- [ ] **Step 4: Commit final**

```bash
git add apps/web/src/app/\(dashboard\)/reports/
git commit -m "feat(procedure): ruta section-list apunta a /procedure"
```

- [ ] **Step 5: Probar manualmente en el navegador**

1. Abrir un informe existente → verificar que "Procedimiento y pruebas" en la tabla de secciones muestra el link "Editar" y apunta a `/reports/[id]/procedure`
2. Ir a la página → verificar que se ven los dos paneles (Instrumentos y Procedimiento)
3. Seleccionar tests, configurar procedimiento → "Guardar y generar" → verificar que aparece el texto generado en el textarea
4. Editar el texto → "Guardar cambios" → verificar que persiste al recargar
5. "Aprobar sección" → verificar que el badge cambia a "Aprobado" y los campos quedan en solo lectura

---

## Self-Review

Cobertura del spec:

| Requisito | Task |
|---|---|
| Nombres clínicos en español | Task 1 |
| DTO con todos los campos | Task 2 |
| Regla entrevista PARENTS/PATIENT/BOTH/NONE | Task 3 |
| Regla modality presencial/telepresencial | Task 3 |
| Regla cuestionarios con destinatario | Task 3 |
| Regla "Pruebas aplicadas" lista cognitiva + cuestionarios | Task 3 |
| Validación: questionnairesShared sin cuestionarios → 400 | Task 4 |
| GET endpoint carga estado existente | Task 4 |
| POST endpoint genera y guarda | Task 4 |
| Módulo registrado en AppModule | Task 5 |
| Tipos y métodos en api-client | Task 6 |
| Página server component con notFound | Task 7 |
| Formulario: checkboxes instrumentos editables | Task 7 |
| Formulario: ADI-R muestra radio de modalidad | Task 7 |
| Formulario: checkbox cuestionarios deshabilitado si no hay cuestionarios | Task 7 |
| Textarea editable + guardar cambios + aprobar | Task 7 |
| Ruta section-list actualizada | Task 8 |
