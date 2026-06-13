# Sección 4 — Procedimiento y pruebas aplicadas

> Fecha: 2026-06-13  
> Estado: Aprobado

## Contexto

La sección `PROCEDURE_TESTS` existía en la BD pero solo tenía la ruta genérica del editor de secciones (textarea vacío). Esta spec define la página dedicada con formulario estructurado y generación de texto por reglas (sin IA), siguiendo el mismo patrón que `interview`, `observation` y `conclusions`.

El texto generado sigue el modelo real de Neuropsia, con dos subsecciones: **Procedimiento** y **Pruebas aplicadas**.

---

## 1. Datos capturados

Guardados en `ReportSection.sourceData` (JSON) de la sección `PROCEDURE_TESTS`.

```ts
interface ProcedureSourceData {
  interviewWith: 'PARENTS' | 'PATIENT' | 'BOTH' | 'NONE';
  interviewModality: 'PRESENCIAL' | 'TELEPRESENCIAL';
  adirModality: 'PRESENCIAL' | 'TELEPRESENCIAL'; // solo relevante si ADI-R en selectedTests
  questionnairesShared: boolean;
  questionnaireRespondent: 'FAMILY' | 'PATIENT' | 'TEACHER' | 'OTHER' | null;
  questionnaireRespondentCustom: string | null; // si questionnaireRespondent === 'OTHER'
}
```

`selectedTests` se guarda en `Report.selectedTests` (campo existente). Se actualiza desde esta página.

---

## 2. Reglas de generación de texto

### Subsección "Procedimiento"

**Frase de entrevista** (primera oración):

| `interviewWith` | `interviewModality` | Texto |
|---|---|---|
| `PARENTS` | `PRESENCIAL` | "Se realizó entrevista con los padres de [nombre], con el objetivo de indagar en antecedentes relevantes para la evaluación." |
| `PARENTS` | `TELEPRESENCIAL` | "Se realizó entrevista telefónica con los padres de [nombre], con el objetivo de indagar en antecedentes relevantes para la evaluación." |
| `PATIENT` | `PRESENCIAL` | "Se realizó entrevista con [nombre], con el objetivo de indagar en antecedentes relevantes para la evaluación." |
| `PATIENT` | `TELEPRESENCIAL` | "Se realizó entrevista telefónica con [nombre], con el objetivo de indagar en antecedentes relevantes para la evaluación." |
| `BOTH` | `PRESENCIAL` | "Se realizó entrevista con [nombre] y sus padres, con el objetivo de indagar en antecedentes relevantes para la evaluación." |
| `BOTH` | `TELEPRESENCIAL` | "Se realizó entrevista telefónica con [nombre] y sus padres, con el objetivo de indagar en antecedentes relevantes para la evaluación." |
| `NONE` | — | (se omite la frase de entrevista) |

**Cuerpo fijo** (siempre presente, tras la frase de entrevista):

```
Posteriormente, se realizó una evaluación completa en Neuropsia.
Cada una de estas sesiones se enfocó en evaluar las diferentes dimensiones cognitivas a través de diversas pruebas.
```

**Párrafo de cuestionarios** (solo si `questionnairesShared === true`):

| `questionnaireRespondent` | Texto del destinatario |
|---|---|
| `FAMILY` | "para la familia" |
| `PATIENT` | "para [nombre]" |
| `TEACHER` | "para los docentes de [nombre]" |
| `OTHER` | `questionnaireRespondentCustom` |

```
Además, se envió un set de cuestionarios [destinatario], que buscaban obtener información
sobre la conducta de [nombre] en diversos contextos. Estos cuestionarios fueron respondidos
fuera de las sesiones de evaluación y se devolvieron al/a la evaluador/a.
```

---

### Subsección "Pruebas aplicadas"

**Intro fija** (siempre):
```
Esta evaluación incluyó pruebas neuropsicológicas de dominio general y específico.
Se privilegió el uso de pruebas actualizadas con baremos poblacionales apropiados
para población chilena.
```

**Lista de tests neuropsicológicos:**
- Siempre comienza con "Entrevista clínica."
- Seguida de los tests seleccionados con `type != 'questionnaire'`, en el orden de `orderIndex` de `CognitiveTest`.
- Si ADI-R está seleccionado y `adirModality === 'TELEPRESENCIAL'`, se agrega al final: "La Entrevista para el Diagnóstico del Autismo (ADI-R) fue aplicada de forma telepresencial."

Formato: `"Fueron aplicadas: Entrevista clínica. [Nombre test 1]. [Nombre test 2]."`

**Párrafo de cuestionarios** (solo si hay tests con `type === 'questionnaire'` en `selectedTests`):
```
Además de lo anterior, se aplicaron cuestionarios de valoración subjetiva, con el objetivo
de evaluar la presencia de sintomatología emocional, conductual y la autonomía de [nombre],
entre las que se encuentran: [Nombre cuestionario 1]. [Nombre cuestionario 2].
```

---

### Nombres clínicos en español

Los nombres en `CognitiveTest.name` están en inglés en el seed actual. Como parte de esta implementación se actualiza el seed con los nombres clínicos en español usados en los informes:

| Código | Nombre clínico (español) |
|---|---|
| WISC-V | Escala de Inteligencia de Wechsler para Niños, quinta edición (WISC-V) |
| WAIS-IV | Escala de Inteligencia de Wechsler para Adultos, cuarta edición (WAIS-IV) |
| TFCRO | Test de la Figura Compleja de Rey-Osterrieth (TFCRO) |
| TAVEC | Test de Aprendizaje Verbal España-Complutense (TAVEC) |
| TAVECI | Test de Aprendizaje Verbal España-Complutense Infantil (TAVECI) |
| WCST | Wisconsin Card Sorting Test (WCST) |
| TMT | Trail Making Test (TMT) |
| CARAS-R | Test de Percepción de Diferencias-Revisado (CARAS-R) |
| ADOS-2 | Escala de Observación para el Diagnóstico del Autismo, segunda edición (ADOS-2) |
| ADI-R | Entrevista para el Diagnóstico del Autismo-Revisada (ADI-R) |
| BASC-3 | Sistema de Evaluación de la Conducta de Niños y Adolescentes, tercera edición (BASC-3) |
| ASRS-18 | Escala de Autoevaluación del TDAH en Adultos (ASRS-18) |
| DEX-SP | Cuestionario Disejecutivo (DEX-Sp) |
| BAI | Inventario de Ansiedad de Beck (BAI) |
| BDI-II | Inventario de Depresión de Beck, segunda edición (BDI-II) |

---

## 3. API — ProcedureModule

### Endpoint único

`POST /procedure/:reportId`

**Body:**
```ts
{
  selectedTests: string[];
  interviewWith: 'PARENTS' | 'PATIENT' | 'BOTH' | 'NONE';
  interviewModality: 'PRESENCIAL' | 'TELEPRESENCIAL';
  adirModality: 'PRESENCIAL' | 'TELEPRESENCIAL';
  questionnairesShared: boolean;
  questionnaireRespondent: 'FAMILY' | 'PATIENT' | 'TEACHER' | 'OTHER' | null;
  questionnaireRespondentCustom?: string;
}
```

**Lógica del servicio:**
1. Verificar que el informe pertenece al usuario (igual que otros módulos).
2. Actualizar `Report.selectedTests`.
3. Buscar `CognitiveTest[]` para los tests seleccionados (nombre + tipo + orderIndex).
4. Obtener `patientName` desde `report.patient.name`.
5. Aplicar reglas → generar texto.
6. Upsert `ReportSection` donde `sectionType = PROCEDURE_TESTS`:
   - `sourceData` = datos crudos del formulario
   - `content` = texto generado
   - `generatedBy` = `RULES`
   - `status` = `CLINICIAN_REVIEWING`
7. Registrar en `AuditLog`.
8. Devolver `{ content, status, sourceData }`.

**GET /procedure/:reportId** — carga estado inicial de la página:
- Devuelve `{ selectedTests, frameworkCode, procedureData, content, sectionStatus }`.

---

## 4. Frontend — página `/reports/[id]/procedure`

### `page.tsx` (Server Component)
Carga en paralelo:
- `GET /procedure/:reportId` → estado guardado
- Lista de tests del catálogo filtrado por `frameworkCode` (ya disponible en `apiClient`)

Pasa todo a `ProcedureForm`.

### `_components/procedure-form.tsx` (Client Component)

Layout de dos columnas:

**Columna izquierda — Instrumentos**
- Checkboxes agrupados por dominio (inteligencia, cognitivo, cognición social, cuestionarios)
- Pre-marcados con `selectedTests` actual del informe
- Si ADI-R está marcado → aparece radio "Modalidad ADI-R: Presencial / Telepresencial"

**Columna derecha — Procedimiento**
- Select "Entrevista con": Padres, Paciente, Ambos, No se realizó
- Radio "Modalidad entrevista": Presencial / Telepresencial (deshabilitado si `interviewWith === NONE`)
- Checkbox "Se compartieron cuestionarios"
- Si cuestionarios = true → Select "Respondidos por": Familia, Paciente, Docentes, Otro
  - Si "Otro" → input de texto

**Botón "Guardar y generar"** → llama al endpoint → muestra texto generado abajo.

**Área de texto generado** (aparece después del primer guardado):
- Textarea editable con el texto completo
- Botón "Guardar cambios" (actualiza solo `content`, no regenera)
- Botón "Aprobar sección" (cambia estado a `APPROVED`)
- Badge de estado de la sección

---

## 5. Cambios en archivos existentes

### `section-list.tsx`
Cambiar ruta de `PROCEDURE_TESTS`:
```ts
// antes
PROCEDURE_TESTS: 'sections/PROCEDURE_TESTS',
// después
PROCEDURE_TESTS: 'procedure',
```

### `api-client.ts`
Agregar:
```ts
getProcedureSection(reportId): GET /procedure/:reportId
upsertProcedure(reportId, body): POST /procedure/:reportId
saveProcedureContent(reportId, content): PATCH /reports/:reportId/sections/PROCEDURE_TESTS
```

### `app.module.ts`
Importar `ProcedureModule`.

### `prisma/seed/02-tests-catalog.ts`
Actualizar los 15 nombres a los nombres clínicos en español definidos en la tabla de la Sección 2.

---

## 6. Tests

- `procedure.service.spec.ts`: casos de generación de texto (todos los valores de `interviewWith`, cuestionarios sí/no, ADI-R telepresencial, paciente sin nombre de padres, sin tests cognitivos, etc.)
- No se requieren cambios de schema → no hay migración.

---

## 7. Archivos a crear/modificar (resumen)

| Acción | Archivo |
|---|---|
| Crear | `apps/api/src/modules/procedure/procedure.module.ts` |
| Crear | `apps/api/src/modules/procedure/procedure.controller.ts` |
| Crear | `apps/api/src/modules/procedure/procedure.service.ts` |
| Crear | `apps/api/src/modules/procedure/dto/upsert-procedure.dto.ts` |
| Crear | `apps/api/src/modules/procedure/dto/get-procedure.dto.ts` |
| Crear | `apps/api/src/modules/procedure/__tests__/procedure.service.spec.ts` |
| Crear | `apps/web/src/app/(dashboard)/reports/[id]/procedure/page.tsx` |
| Crear | `apps/web/src/app/(dashboard)/reports/[id]/procedure/_components/procedure-form.tsx` |
| Modificar | `apps/api/src/app.module.ts` |
| Modificar | `apps/web/src/lib/api-client.ts` |
| Modificar | `apps/web/src/app/(dashboard)/reports/[id]/_components/section-list.tsx` |
| Modificar | `prisma/seed/02-tests-catalog.ts` |
