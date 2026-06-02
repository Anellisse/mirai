# Paso 5 — Ingreso de puntajes + PDF adjunto + Tablas de anexos

> Fecha: 2026-06-02  
> Estado: Aprobado (diseño propio — continúa desde spec Paso 4)

## Contexto

El Paso 4 construyó el motor de reglas. El Paso 5 agrega la capa de datos de entrada: la UI donde el clínico ingresa los puntajes de cada test aplicado, adjunta el PDF original como evidencia, y visualiza las tablas de resultados que irán en el Anexo del informe. Al final de la página, un botón dispara el motor de reglas (Paso 4) para generar las secciones 5b/5c/5d/6.

---

## 1. Cambio de schema

### TestResult — agregar unique constraint
```prisma
@@unique([reportId, testId])
```
Necesario para que el upsert sea determinista y el motor de reglas no procese duplicados.

---

## 2. API — nuevos módulos

### EvaluationModule
| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/reports/:id/test-results` | Retorna `TestResult[]` del informe, con info del test y sus slots |
| `PUT` | `/reports/:id/test-results/:testId` | Upsert `{ scores: Record<string, number \| null> }` |

`scores` es el JSON con `{ slotKey: value }` que el motor de reglas ya sabe leer.

### ScorePdfsModule
| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/reports/:id/score-pdfs` | Sube PDF (multipart `file`); valida MIME; calcula SHA-256; guarda en `storage/imported-pdfs/{reportId}/`; registra en `ImportedScoreReport` |
| `GET` | `/reports/:id/score-pdfs` | Lista PDFs del informe |
| `DELETE` | `/reports/:id/score-pdfs/:pdfId` | Elimina registro + archivo |

- Validación: solo `application/pdf`, máx 20 MB.
- En MVP `source = MANUAL` siempre.
- Path de almacenamiento configurable vía `STORAGE_BASE_PATH` (env, default derivado de cwd).

### AnnexTablesModule
| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/reports/:id/annex-tables` | Retorna datos estructurados para tablas de anexo |

Respuesta:
```json
{
  "wechslerIndices": [{ "testCode", "testName", "slotKey", "slotName", "standardScore", "percentile", "descriptor" }],
  "wechslerSubtests": [{ "testCode", "testName", "slotKey", "slotName", "scaledScore", "descriptor" }],
  "battery": [{ "testCode", "testName", "slotKey", "slotName", "score", "scoreType", "percentile", "descriptor" }],
  "questionnaires": [{ "testCode", "testName", "slotKey", "slotName", "rawScore", "classification" }]
}
```

Clasificación de slots:
- `scoreType = SS` + test es Wechsler (WISC-V/WAIS-IV) → `wechslerIndices`
- `scoreType = SCALED` → `wechslerSubtests`
- tipo de test = `questionnaire` → `questionnaires`
- resto → `battery`

---

## 3. Web — nueva página

### `/reports/[id]/evaluation`

**Server component** carga: report detail, test-results, score-slots por test aplicado, annex-tables.

**Client component `EvaluationForm`:**
- Por cada test seleccionado en el informe: panel con:
  - Nombre del test
  - Input numérico por slot (label + scoreType como hint)
  - Botón "Guardar puntajes" (PUT /reports/:id/test-results/:testId)
  - Botón "Adjuntar PDF" (POST /reports/:id/score-pdfs, lista los subidos)
- Botón global **"Generar secciones"** → POST /reports/:id/generate-sections con las secciones que apliquen según los tests
- Sección **"Tabla de resultados"** → muestra annex-tables tras guardar puntajes

### section-list: nuevas rutas
```
COGNITIVE_EVALUATION    → evaluation
QUESTIONNAIRE_SYMPTOMS  → evaluation
SOCIAL_COGNITION        → evaluation
RESULTS_SYNTHESIS       → evaluation
```

---

## 4. Casos límite

| Caso | Comportamiento |
|---|---|
| MIME no PDF | 400 |
| Archivo > 20 MB | 413 |
| PDF duplicado (mismo hash, mismo informe) | Acepta igual (el usuario puede subir varias versiones) |
| Slot sin valor en scores | No procesado por motor (skip silencioso) |
| Test sin slots | Panel aparece pero sin inputs |
| Puntaje fuera de rango lógico | Advertencia visual en UI, no bloquea guardado |

---

## 5. Fuera de scope en este paso

- Extracción automática desde PDF (Fase 2: Q-global; Fase 3: TEAcorrige/CEDETI)
- URLs firmadas para descarga de PDFs (Paso 9)
- Gráficos (Paso 7)
- UI de baremos normativos (Paso 9)
