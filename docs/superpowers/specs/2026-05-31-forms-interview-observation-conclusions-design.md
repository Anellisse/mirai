# Paso 3 — Formularios: Antecedentes, Conducta y Conclusiones

> Fecha: 2026-05-31  
> Estado: Aprobado por usuario

## Contexto

El Paso 3 implementa los tres formularios de entrada clínica que alimentan las secciones `BACKGROUND`, `OBSERVED_BEHAVIOR` y `CONCLUSIONS` del informe. Los formularios **no generan texto de informe todavía** — eso ocurre en Pasos 6 y posteriores. Este paso solo persiste datos estructurados.

Relación con el informe:
```
InterviewForm.data      ──► (Paso 6: IA)    ──► ReportSection[BACKGROUND].content
ObservationChecklist.data ──► (Paso 6: IA)  ──► ReportSection[OBSERVED_BEHAVIOR].content
ClinicalConclusion.*    ──► (reglas, no IA) ──► ReportSection[CONCLUSIONS].content
```

---

## 1. Formulario de Antecedentes Relevantes (`InterviewForm`)

Persiste en `InterviewForm.data: Json`. Un único registro por informe (upsert). Todas las secciones son opcionales excepto las marcadas.

### Secciones y campos

| # | Sección | Campos principales |
|---|---|---|
| 1 | **Motivo de consulta** | `whoConsults` (enum: paciente/padres/institución/otro), `whyConsults` (texto), `purposeOfEvaluation` (texto) |
| 2 | **Contexto familiar** | `householdMembers` (texto), `householdRelationType` (enum: biparental/monoparental/reconstituida/otro), `primaryCaregivers` (texto), `psychosocialContext` (texto) |
| 3 | **Historia del desarrollo** | `pregnancyAndBirth` (enum: normal/complicado + `detail: texto`), `psychomotorMilestones` (enum: normal/atrasado + `detail`), `languageDevelopment` (enum: normal/atrasado + `detail`), `sphincterControl` (texto libre) |
| 4 | **Conducta y sintomatología en la infancia** | `childhoodBehavior` (texto), `childhoodSymptoms` (texto), `emotionalRegulationChildhood` (texto), `relationshipWithAuthority` (texto) |
| 5 | **Sintomatología actual** | `symptomsPresist` (enum: sí/no/cambiaron), `currentSymptomsDescription` (texto), `dailyFunctioningImpact` (texto), `currentTreatments` (texto) |
| 6 | **Desarrollo social + hobbies** | `childhoodPeerRelations` (enum: buenas/dificultades/aislamiento), `childhoodFriendships` (enum: varias/pocas/ninguna), `currentFriendships` (texto), `currentSocialNetworks` (texto), `hobbiesAndInterests` (texto) |
| 7 | **Historia escolar / laboral** | `educationLevel` (texto), `academicPerformance` (enum: bueno/regular/bajo), `gradeRepetitions` (bool), `receivedSupport` (texto — PIE, psicopedagogía, etc.), `workSituation` (texto — solo adultos) |
| 8 | **Antecedentes médicos (personales y familiares)** | `previousDiagnoses` (texto), `currentMedication` (texto — nombre + dosis), `hospitalizationsTraumas` (texto), `previousEvaluations` (texto), `familyMedicalHistory` (texto) |

### Almacenamiento

Los datos se guardan como JSON con la forma `{ section1: {...}, section2: {...}, ... }`. No hay validación de esquema rígida en BD — la validación ocurre en el DTO de NestJS.

---

## 2. Checklist de Conducta Observada (`ObservationChecklist`)

Persiste en `ObservationChecklist.data: Json`. Escala de 3 niveles: `0` = Sin dificultad, `1` = Leve-moderado, `2` = Severo.

### Ítems por grupo

| Grupo | Ítems |
|---|---|
| **Actitud y disposición** | cooperacion, motivacion, ansiedad, toleranciaFrustracion |
| **Atención y actividad motora** | atencionSostenida, nivelActividad (`hipo/normo/hiper`), impulsividad, fatiga |
| **Comunicación y lenguaje** | comprensionInstrucciones, expresionVerbal (`fluida/reducida/excesiva`), calidadLenguaje |
| **Interacción social** | contactoVisual, reciprocidadSocial, relacionEvaluador |
| **Otros aspectos** | coordinacionMotora, conductasEstereotipadas, rigidezConductual |

Además: `additionalObservations: String` (texto libre).

**Notas especiales**: `nivelActividad` y `expresionVerbal` son ítems de tipo cualitativo (no escala 0-1-2, sino selección de opción: hipo/normo/hiper y fluida/reducida/excesiva). Los demás usan la escala 0-1-2.

### Almacenamiento

```json
{
  "cooperacion": 0,
  "motivacion": 1,
  "ansiedad": 2,
  "nivelActividad": "hiper",
  "expresionVerbal": "reducida",
  "additionalObservations": "..."
}
```

---

## 3. Formulario de Conclusiones (`ClinicalConclusion`)

La conclusión **nunca usa IA**. El clínico redacta directamente. El formulario tiene 5 bloques que se ensamblan en el texto final del informe.

### Schema extendido

Campos nuevos en `ClinicalConclusion`:

| Campo | Tipo | Descripción |
|---|---|---|
| `processNarrative` | String? | Bloque 1: resumen conductual del proceso |
| `cognitiveImpact` | String? | Bloque 3: impacto cognitivo actual |
| `emotionalNote` | String? | Bloque 4: párrafo sintomatología emocional |
| `includeEmotionalNote` | Boolean | Si `false`, el bloque 4 no aparece en el informe |
| `closingNote` | String? | Bloque 5: párrafo de cierre (pre-cargado desde plantilla org) |

El campo `content` existente se usa como texto compilado final (para export). Las hipótesis diagnósticas usan el modelo `DiagnosticHypothesis` extendido.

### Bloque 1 — Resumen del proceso conductual

Texto libre. **Pre-llenado automáticamente** a partir del `ObservationChecklist` del informe cuando el clínico abre las conclusiones por primera vez (si el checklist ya existe). El clínico puede editar libremente.

### Bloque 2 — Diagnóstico(s) con especificadores y justificación

Lista de `DiagnosticHypothesis`. Cada hipótesis tiene:

| Campo | Tipo | Descripción |
|---|---|---|
| `dxCode` | String | Código DSM-5-TR (FK a `DiagnosticCode.code`) |
| `dxName` | String | Nombre del diagnóstico (desnormalizado para lectura rápida) |
| `specifiers` | String[] | Especificadores seleccionados del catálogo |
| `justification` | String? | Justificación: síntomas + impacto actual |
| `status` | Enum | `PROVISIONAL` / `CONFIRMED` / `RULE_OUT` |
| `orderIndex` | Int | Orden de aparición |

### Bloque 3 — Impacto cognitivo actual

Texto libre. Redactado directamente por el clínico.

### Bloque 4 — Sintomatología emocional (condicional)

Toggle `includeEmotionalNote: Boolean`. Si está activado, el campo `emotionalNote` se incluye en el informe exportado. Si no hay nota guardada, se pre-carga desde una plantilla configurable por el admin.

### Bloque 5 — Párrafo de cierre

Pre-cargado desde `Organization.closingNoteTemplate` (campo nuevo en org). Editable por el clínico para ese informe específico.

---

## 4. Catálogo DSM-5-TR (`DiagnosticCode`)

### Modelo nuevo

```prisma
model DiagnosticCode {
  code        String   @id        // Ej: "F84.0"
  name        String              // Ej: "Trastorno del Espectro Autista"
  category    String              // Ej: "Trastornos del Neurodesarrollo"
  specifiers  String[]            // Opciones de especificadores para este dx
  isActive    Boolean @default(true)
}
```

### Subconjunto neuropsicológico (~80 códigos)

Categorías incluidas en el seed:

| Categoría | Ejemplos |
|---|---|
| Trastornos del Neurodesarrollo | TEA (F84.0), TDAH combinado/inatento/hiperactivo (F90.0-2), Discapacidad intelectual (F70-73), Trastornos del lenguaje (F80.x), Trastorno específico del aprendizaje (F81.x), DCD/TAC (F82), Tics (F95.x) |
| Trastornos de Ansiedad | TAG (F41.1), Fobia social (F40.10), Fobia específica (F40.2x), Pánico (F41.0), Ansiedad de separación (F93.0) |
| Trastornos Depresivos | TDM episodio único/recurrente (F32.x, F33.x), Distimia (F34.1), Trastorno disruptivo del estado de ánimo (F34.8) |
| Trauma y Estrés | TEPT (F43.10), TEA/trauma agudo (F43.0), Trastorno adaptativo (F43.2x) |
| TOC y relacionados | TOC (F42.2), Tricotilomanía (F63.3), Excoriación (L98.1) |
| Trastornos de la Conducta | TOD (F91.3), Trastorno de conducta (F91.x) |
| Trastornos del Sueño | Insomnio (G47.00), Hipersomnia (G47.10) |
| Trastornos Neurocognitivos | TCL (G31.84), Demencia/TNC mayor (F02.x) |
| Trastornos del Espectro Esquizofrénico | Solo los relevantes para diferencial (F20.x, F25.x) |
| Sin diagnóstico / Otros | Z03.89 (descartado), Z13.89 (sospecha), R41.3 (otras quejas cognitivas) |

---

## 5. Schema — Migraciones requeridas

### Cambios en modelos existentes

```prisma
// ClinicalConclusion — añadir campos
model ClinicalConclusion {
  // ...campos existentes...
  processNarrative      String?
  cognitiveImpact       String?
  emotionalNote         String?
  includeEmotionalNote  Boolean @default(false)
  closingNote           String?
}

// DiagnosticHypothesis — el campo `content: String` existente se ELIMINA
// (migración destructiva, pero no hay datos aún en producción)
model DiagnosticHypothesis {
  id           String  @id @default(cuid())
  conclusionId String
  dxCode       String
  dxName       String
  specifiers   String[]
  justification String?
  status       DiagnosticStatus @default(PROVISIONAL)
  orderIndex   Int     @default(0)

  conclusion ClinicalConclusion @relation(fields: [conclusionId], references: [id])
  dx         DiagnosticCode     @relation(fields: [dxCode], references: [code])
}

// Organization — añadir plantilla de cierre
model Organization {
  // ...campos existentes...
  closingNoteTemplate String?
}
```

### Modelos nuevos

```prisma
model DiagnosticCode {
  code       String   @id
  name       String
  category   String
  specifiers String[]
  isActive   Boolean  @default(true)

  hypotheses DiagnosticHypothesis[]
}

enum DiagnosticStatus {
  PROVISIONAL
  CONFIRMED
  RULE_OUT
}
```

---

## 6. Módulos NestJS

| Módulo | Archivo | Endpoints |
|---|---|---|
| `InterviewModule` | `modules/interview/` | `GET /reports/:id/interview`, `PUT /reports/:id/interview` |
| `ObservationModule` | `modules/observation/` | `GET /reports/:id/observation`, `PUT /reports/:id/observation` |
| `ConclusionModule` | `modules/conclusion/` | `GET /reports/:id/conclusion`, `PUT /reports/:id/conclusion` |
| `DiagnosticCodeModule` | `modules/diagnostic-codes/` | `GET /diagnostic-codes?q=&category=` |

Todos los endpoints requieren `JwtAuthGuard`. El `PUT` verifica que el usuario sea autor o supervisor del informe, y que el informe no esté en estado `APPROVED`, `EXPORTED` o `FINAL`.

---

## 7. Rutas web

| Ruta | Componente | Sección informe |
|---|---|---|
| `/reports/[id]/interview` | `InterviewFormPage` | `BACKGROUND` |
| `/reports/[id]/observation` | `ObservationChecklistPage` | `OBSERVED_BEHAVIOR` |
| `/reports/[id]/conclusions` | `ConclusionsPage` | `CONCLUSIONS` |

Acceso desde el link "Editar" en la tabla de secciones del reporte (ya existente en `section-list.tsx`). Las páginas son client components con botón "Guardar" explícito (MVP). Auto-save es post-MVP.

---

## 8. Comportamientos especiales

### Auto-prellenado del Bloque 1 de Conclusiones

Cuando el clínico abre `/reports/[id]/conclusions` y el `processNarrative` está vacío, el sistema llama `GET /reports/:id/observation` y genera un texto base a partir de las respuestas del checklist (regla determinista, no IA):

```
"Durante el proceso de evaluación, [nombre] se mostró [cooperación]. 
Se observó [nivel de actividad] nivel de actividad motora, con [atención] 
concentración sostenida y [ansiedad] nivel de ansiedad..."
```

Este texto se guarda como `processNarrative` y el clínico lo edita.

### Cierre pre-cargado

Si `ClinicalConclusion.closingNote` está vacío al abrir las conclusiones, se copia `Organization.closingNoteTemplate`. Si la org tampoco tiene plantilla, se usa un texto por defecto configurable en `clinical-constants`.

### Compilación del `content` final

Al guardar las conclusiones, el backend ensambla automáticamente `ClinicalConclusion.content` concatenando los bloques activos en orden. Este `content` es el que se usa para `ReportSection[CONCLUSIONS].content` y para el export.

---

## 9. Fuera de scope en este paso

- Generación de texto IA para BACKGROUND y OBSERVED_BEHAVIOR (Paso 6)
- Editor rich-text (TipTap) para las secciones — por ahora textarea (Paso 7)
- Gestión del catálogo DSM-5-TR por admin en UI (Paso 9)
- Agregar/editar códigos DSM-5-TR desde el panel admin (Paso 9)
