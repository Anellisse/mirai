# Step 8 — Export Word/PDF + Informe Final — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conectar los módulos de export y finalize al backend y construir la UI de descarga y sellado del informe final.

**Architecture:** La lógica de negocio API ya existe en `ExportModule` y `FinalizeModule` (no commiteados). Solo hay que registrarlos en `app.module.ts`. En el frontend se agrega un `ExportButton` que descarga + transiciona el estado, y una página `/finalize` con un formulario de dos opciones (Word del sistema o PDF subido) que termina en pantalla de éxito con hash y firma.

**Tech Stack:** NestJS (API), Next.js App Router + TypeScript + Tailwind (web), docx (generación Word), multer (upload PDF), sha256 (integridad).

---

## File Map

| Acción | Archivo |
|---|---|
| Modificar | `apps/api/src/app.module.ts` |
| Modificar | `apps/web/src/lib/api-client.ts` |
| Crear | `apps/web/src/app/(dashboard)/reports/[id]/_components/export-button.tsx` |
| Modificar | `apps/web/src/app/(dashboard)/reports/[id]/_components/report-overview.tsx` |
| Crear | `apps/web/src/app/(dashboard)/reports/[id]/finalize/page.tsx` |
| Crear | `apps/web/src/app/(dashboard)/reports/[id]/finalize/_components/finalize-form.tsx` |

---

## Task 1: Registrar ExportModule y FinalizeModule en el backend

**Files:**
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Agregar los imports en app.module.ts**

Abrir `apps/api/src/app.module.ts` y agregar al final de los imports existentes:

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
  ],
})
export class AppModule {}
```

- [ ] **Step 2: Correr todos los tests del API**

```bash
cd apps/api && pnpm test
```

Expected: todos los tests pasan (incluyendo los de ExportService y FinalizeService). El número total debe ser ≥ 155 (142 existentes + 4 export + 9 finalize).

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/app.module.ts apps/api/src/modules/export apps/api/src/modules/finalize
git commit -m "feat(api): register ExportModule and FinalizeModule"
```

---

## Task 2: Agregar métodos al apiClient web

**Files:**
- Modify: `apps/web/src/lib/api-client.ts`

- [ ] **Step 1: Agregar la interfaz FinalReportData al final del archivo**

Al final de `apps/web/src/lib/api-client.ts`, después de la interfaz `AnnexTablesData`, agregar:

```typescript
export interface FinalReportData {
  id: string;
  reportId: string;
  source: 'SYSTEM_PDF' | 'UPLOADED';
  fileHash: string;
  signature: string;
  version: number;
  finalizedAt: string;
}
```

- [ ] **Step 2: Agregar downloadDocx y finalizeReport en el objeto apiClient**

Dentro del objeto `apiClient`, después de `generateObservation`, agregar:

```typescript
  // Export — download Word
  downloadDocx: async (reportId: string): Promise<void> => {
    const authHeader = await getAuthHeader();
    const res = await fetch(`${API_URL}/reports/${reportId}/export/docx`, {
      headers: authHeader,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error((err as any).message ?? `API error ${res.status}`);
    }
    const blob = await res.blob();
    const disposition = res.headers.get('content-disposition') ?? '';
    const match = disposition.match(/filename="([^"]+)"/);
    const filename = match ? decodeURIComponent(match[1]) : `Informe_${reportId}.docx`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  // Finalize — seal report
  finalizeReport: async (
    reportId: string,
    source: 'SYSTEM_PDF' | 'UPLOADED',
    file?: File,
  ): Promise<FinalReportData> => {
    const authHeader = await getAuthHeader();
    const form = new FormData();
    form.append('source', source);
    if (file) form.append('file', file);
    const res = await fetch(`${API_URL}/reports/${reportId}/finalize`, {
      method: 'POST',
      headers: authHeader,
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error((err as any).message ?? `API error ${res.status}`);
    }
    return res.json() as Promise<FinalReportData>;
  },
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/api-client.ts
git commit -m "feat(web): add downloadDocx and finalizeReport to apiClient"
```

---

## Task 3: ExportButton y actualizar ReportOverview

**Files:**
- Create: `apps/web/src/app/(dashboard)/reports/[id]/_components/export-button.tsx`
- Modify: `apps/web/src/app/(dashboard)/reports/[id]/_components/report-overview.tsx`

- [ ] **Step 1: Crear export-button.tsx**

Crear `apps/web/src/app/(dashboard)/reports/[id]/_components/export-button.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

export function ExportButton({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleClick() {
    setLoading(true);
    setError('');
    try {
      await apiClient.downloadDocx(reportId);
      await apiClient.transitionReport(reportId, 'export');
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? 'Error al exportar');
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
        {loading ? 'Exportando...' : 'Exportar'}
      </button>
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Actualizar report-overview.tsx**

Reemplazar el contenido completo de `apps/web/src/app/(dashboard)/reports/[id]/_components/report-overview.tsx`:

```typescript
import Link from 'next/link';
import { ReportDetail } from '@/lib/api-client';
import { SectionList } from './section-list';
import { TransitionButton } from './transition-button';
import { ExportButton } from './export-button';

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

function getTransitionActions(status: string): ActionConfig[] {
  const map: Record<string, ActionConfig[]> = {
    DRAFT: [{ action: 'start', label: 'Iniciar redacción' }],
    IN_PROGRESS: [{ action: 'submit', label: 'Enviar a revisión' }],
    REVIEW: [
      { action: 'submit', label: 'Enviar a revisión supervisora' },
      { action: 'approve', label: 'Aprobar' },
    ],
    SUPERVISOR_REVIEW: [{ action: 'approve', label: 'Aprobar' }],
  };
  return map[status] ?? [];
}

export function ReportOverview({ report }: { report: ReportDetail }) {
  const transitionActions = getTransitionActions(report.status);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className={`text-sm font-medium px-3 py-1 rounded-full ${STATUS_COLOR[report.status] ?? 'bg-gray-100'}`}>
          {STATUS_LABEL[report.status] ?? report.status}
        </span>
        <span className="text-sm text-gray-500">{report.frameworkCode}</span>
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {transitionActions.map((a) => (
          <TransitionButton key={a.action} reportId={report.id} action={a.action} label={a.label} />
        ))}
        {report.status === 'APPROVED' && (
          <ExportButton reportId={report.id} />
        )}
        {report.status === 'EXPORTED' && (
          <Link
            href={`/reports/${report.id}/finalize`}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700"
          >
            Finalizar informe
          </Link>
        )}
        <Link
          href={`/reports/${report.id}/evaluation`}
          className="border border-blue-300 text-blue-700 hover:bg-blue-50 px-4 py-1.5 rounded-md text-sm font-medium"
        >
          Ingreso de puntajes
        </Link>
      </div>

      <SectionList sections={report.sections} reportId={report.id} />
    </div>
  );
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/reports/\[id\]/_components/export-button.tsx \
        apps/web/src/app/\(dashboard\)/reports/\[id\]/_components/report-overview.tsx
git commit -m "feat(web): ExportButton and updated ReportOverview for export/finalize"
```

---

## Task 4: Página /finalize con FinalizeForm

**Files:**
- Create: `apps/web/src/app/(dashboard)/reports/[id]/finalize/page.tsx`
- Create: `apps/web/src/app/(dashboard)/reports/[id]/finalize/_components/finalize-form.tsx`

- [ ] **Step 1: Crear la página servidor finalize/page.tsx**

Crear `apps/web/src/app/(dashboard)/reports/[id]/finalize/page.tsx`:

```typescript
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { FinalizeForm } from './_components/finalize-form';

const ALLOWED_STATUSES = ['APPROVED', 'EXPORTED'];

export default async function FinalizePage({ params }: { params: { id: string } }) {
  let report;
  try {
    report = await apiClient.getReport(params.id);
  } catch {
    notFound();
  }

  if (!ALLOWED_STATUSES.includes(report.status)) {
    redirect(`/reports/${params.id}`);
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link
          href={`/reports/${params.id}`}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          ← Volver al informe
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Sellar versión final</h1>
        {report.patient && (
          <p className="text-sm text-gray-500 mt-1">{report.patient.name}</p>
        )}
      </div>
      <FinalizeForm reportId={params.id} />
    </div>
  );
}
```

- [ ] **Step 2: Crear FinalizeForm**

Crear `apps/web/src/app/(dashboard)/reports/[id]/finalize/_components/finalize-form.tsx`:

```typescript
'use client';

import { useRef, useState } from 'react';
import { apiClient, FinalReportData } from '@/lib/api-client';

type Source = 'SYSTEM_PDF' | 'UPLOADED';
type Phase = 'selecting' | 'loading' | 'success';

export function FinalizeForm({ reportId }: { reportId: string }) {
  const [phase, setPhase] = useState<Phase>('selecting');
  const [source, setSource] = useState<Source | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState<FinalReportData | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const canSubmit =
    source !== null &&
    confirmed &&
    (source === 'SYSTEM_PDF' || file !== null);

  async function handleSubmit() {
    if (!source) return;
    setPhase('loading');
    setError('');
    try {
      const data = await apiClient.finalizeReport(reportId, source, file ?? undefined);
      setResult(data);
      setPhase('success');
    } catch (err: any) {
      setError(err.message ?? 'Error al finalizar el informe');
      setPhase('selecting');
    }
  }

  if (phase === 'success' && result) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-green-800 mb-1">Informe sellado exitosamente</h2>
        <p className="text-sm text-green-700 mb-6">Estado: FINAL</p>
        <div className="bg-white border border-green-100 rounded-lg p-4 text-sm text-gray-700 text-left space-y-2 mb-6">
          <div>
            <span className="font-medium text-gray-900">Firma:</span>{' '}
            <span className="text-gray-600">{result.signature}</span>
          </div>
          <div>
            <span className="font-medium text-gray-900">Hash SHA-256:</span>{' '}
            <span className="font-mono text-xs text-gray-500">{result.fileHash.slice(0, 16)}...</span>
          </div>
          <div>
            <span className="font-medium text-gray-900">Versión:</span>{' '}
            <span className="text-gray-600">v{result.version}</span>
          </div>
        </div>
        <a
          href={`/reports/${reportId}`}
          className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-brand-700 inline-block"
        >
          ← Volver al informe
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setSource('SYSTEM_PDF')}
          className={`border-2 rounded-xl p-6 text-left transition-colors ${
            source === 'SYSTEM_PDF'
              ? 'border-brand-600 bg-brand-50'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
        >
          <div className="text-3xl mb-3">📄</div>
          <div className="font-semibold text-gray-900 mb-1">Opción A — Word del sistema</div>
          <p className="text-sm text-gray-500">
            Usa el documento .docx generado por Mirai como versión oficial sellada.
          </p>
        </button>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={`border-2 rounded-xl p-6 text-left transition-colors ${
            source === 'UPLOADED'
              ? 'border-brand-600 bg-brand-50'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
        >
          <div className="text-3xl mb-3">⬆️</div>
          <div className="font-semibold text-gray-900 mb-1">Opción B — Subir PDF editado</div>
          <p className="text-sm text-gray-500">
            Sube tu propio PDF (editado externamente) como versión oficial.
          </p>
          {file && (
            <p className="text-xs text-brand-600 mt-2 font-medium truncate">{file.name}</p>
          )}
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          setFile(f);
          if (f) setSource('UPLOADED');
        }}
      />

      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
        />
        <span className="text-sm text-gray-700">
          Confirmo que revisé el contenido completo del informe y autorizo su sellado como versión oficial.
        </span>
      </label>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit || phase === 'loading'}
        className="w-full bg-brand-600 text-white py-3 rounded-lg font-medium text-sm hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {phase === 'loading' ? 'Sellando informe...' : 'Sellar informe final'}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/reports/\[id\]/finalize/
git commit -m "feat(web): add /finalize page with FinalizeForm — Step 8 complete"
```

---

## Task 5: Verificación final

- [ ] **Step 1: Correr todos los tests del API**

```bash
cd apps/api && pnpm test
```

Expected: todos los tests pasan, sin errores.

- [ ] **Step 2: Verificar TypeScript completo del monorepo**

```bash
cd apps/web && pnpm tsc --noEmit
cd apps/api && pnpm tsc --noEmit
```

Expected: 0 errores en ambos.

- [ ] **Step 3: Actualizar memoria del proyecto**

Guardar en memoria: Paso 8 completado — ExportModule y FinalizeModule registrados, ExportButton (descarga + transición), página /finalize con Opción A/B, pantalla de éxito con hash y firma.
