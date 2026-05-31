# Paso 4 — Motor de Reglas + Diccionarios Clínicos

> Fecha: 2026-05-31
> Estado: Aprobado por usuario

## Contexto

El Paso 4 implementa el backend completo del motor de reglas neuropsicológicas: convierte puntajes (brutos o estandarizados) en descriptores clínicos, busca texto en diccionarios editables, y ensambla el contenido de las secciones 5b (cuestionarios), 5c (evaluación cognitiva), 5d (cognición social) y 6 (síntesis). El Paso 5 agregará la UI de ingreso de puntajes y el PDF adjunto.

---

## 1. Tipos de puntaje

El sistema maneja cinco tipos de puntaje estandarizado:

| Código | Nombre | Media | DE | Uso principal |
|---|---|---|---|---|
| `Z` | Puntaje Z | 0 | 1 | Mayoría de tests neuropsicológicos |
| `PERCENTILE` | Percentil | — | — | Complementario a Z |
| `T` | Puntaje T | 50 | 10 | Menos frecuente |
| `SCALED` | Escalar Wechsler | 10 | 3 | Subtests WISC-V / WAIS-IV |
| `SS` | Compuesto Wechsler | 100 | 15 | Índices WISC-V / WAIS-IV |

Además existe `RAW` para puntajes brutos que requieren conversión via baremo normativo.

---

## 2. Escalas de descriptores

Cuatro escalas. Los rangos exactos de `NEURO_Z` y `NEURO_PERCENTILE` los define el admin en seed/UI (basados en la clasificación de la Sociedad Americana de Neuropsicología). Los de Wechsler son estándar.

| Código | Aplica a | Rangos de referencia |
|---|---|---|
| `NEURO_Z` | Z-scores (tests neuropsicológicos generales) | Definidos por admin |
| `NEURO_PERCENTILE` | Percentiles (mismos labels que NEURO_Z) | Definidos por admin |
| `WECHSLER_SCALED` | Escalares subtests WISC-V/WAIS-IV | 1–3 Extremadamente bajo … 17–19 Extremadamente alto |
| `WECHSLER_SS` | Índices compuestos WISC-V/WAIS-IV | ≤69 Extremadamente bajo … ≥130 Extremadamente alto |

Cada `DescriptorRange` tiene: `minScore`, `maxScore`, `label` (texto completo), `labelShort` (abreviatura), `orderIndex`.

---

## 3. Modelo de datos

### Nuevos modelos

```prisma
model DescriptorScale {
  code      String  @id
  name      String
  scoreType String  // "Z" | "PERCENTILE" | "T" | "SCALED" | "SS"
  isDefault Boolean @default(false)

  ranges    DescriptorRange[]
  slots     TestScoreSlot[]
}

model DescriptorRange {
  id         String  @id @default(cuid())
  scaleCode  String
  minScore   Float
  maxScore   Float
  label      String
  labelShort String
  orderIndex Int     @default(0)

  scale DescriptorScale @relation(fields: [scaleCode], references: [code])
}

model TestScoreSlot {
  id                  String  @id @default(cuid())
  testId              String
  key                 String  // e.g. "ICV", "TMT_A_SECONDS"
  name                String  // e.g. "Índice de Comprensión Verbal"
  scoreType           String  // "Z" | "PERCENTILE" | "T" | "SCALED" | "SS" | "RAW"
  descriptorScaleCode String
  requiresConversion  Boolean @default(false) // true = necesita tabla normativa
  isInverse           Boolean @default(false) // true = menor puntaje = mejor desempeño
  // Para cuestionarios (5b): puntos de corte en lugar de descriptores continuos
  cutoffBorderline              Float? // score ≥ este valor → limítrofe
  cutoffClinicallySignificant   Float? // score ≥ este valor → clínicamente significativo
  orderIndex          Int     @default(0)

  test            CognitiveTest    @relation(fields: [testId], references: [id])
  descriptorScale DescriptorScale  @relation(fields: [descriptorScaleCode], references: [code])
  normativeTables NormativeTable[]

  @@unique([testId, key])
}

model NormativeTable {
  id                   String   @id @default(cuid())
  slotId               String
  name                 String
  source               String?
  demographicVariables String[] // e.g. ["age"] | ["age", "education"] | ["age", "gender"]
  tableType            String   // "lookup" | "formula"
  isActive             Boolean  @default(true)
  createdAt            DateTime @default(now())

  slot    TestScoreSlot    @relation(fields: [slotId], references: [id])
  entries NormativeEntry[]
}

model NormativeEntry {
  id                String  @id @default(cuid())
  tableId           String
  ageMin            Int?
  ageMax            Int?
  educationYearsMin Int?
  educationYearsMax Int?
  gender            String? // "M" | "F" | null (ambos)

  // Para tableType = "lookup"
  rawScoreMin   Float?
  rawScoreMax   Float?
  standardScore Float?
  percentile    Float?

  // Para tableType = "formula"
  formulaType String? // "z_transform" | "linear" | "regression"
  parameters  Json?   // { mean, sd } | { slope, intercept } | { ...coefs }

  table NormativeTable @relation(fields: [tableId], references: [id])
}
```

### Cambios a modelos existentes

```prisma
// TestResult — añadir
  rawScore      Float?
  standardScore Float?
  scoreType     String? // tipo del standardScore ("Z" | "T" | "SCALED" | "SS" | "PERCENTILE")
  percentile    Float?
  descriptor    String? // ya existe en schema; el motor lo escribe aquí
```

Nota: `CognitiveTest` no necesita cambios — la escala de descriptores se define a nivel de `TestScoreSlot`, que es más granular.

---

## 4. Servicios del motor

### `NormativeService`

Entrada: `{ slotId, rawScore, age, educationYears?, gender? }`
Salida: `{ standardScore, scoreType, percentile? }`

1. Busca `NormativeTable` activa para el slot
2. Filtra `NormativeEntry` por grupo demográfico del paciente (fallback: sin filtro de educación/género si no hay entrada exacta)
3. Para `tableType = "lookup"`: encuentra la fila donde `rawScoreMin ≤ rawScore ≤ rawScoreMax`
4. Para `tableType = "formula"`:
   - `z_transform`: `z = (rawScore - mean) / sd` (invierte signo si `isInverse`)
   - `linear`: `standardScore = slope * rawScore + intercept`
   - `regression`: evalúa ecuación desde `parameters`
5. Si no hay tabla → retorna el rawScore como ya estandarizado (solo si `!requiresConversion`)

### `DescriptorService`

Entrada: `{ standardScore, scoreType, scaleCode, isInverse? }`
Salida: `{ label, labelShort }`

1. Si `isInverse`, invierte el score antes de buscar (p. ej. segundos en TMT: más segundos = peor)
2. Busca `DescriptorRange` donde `minScore ≤ score ≤ maxScore` en la escala indicada
3. Si el score cae fuera de todos los rangos, usa el rango extremo más cercano (nunca falla)

### `DictionaryService`

Entrada: `{ code, variables: Record<string, string> }`
Salida: `string` (texto con variables interpoladas)

1. Busca `ClinicalDictionary` por código exacto
2. Fallback en orden: `{TEST}.{SLOT}.{DESCRIPTOR}` → `{TEST}.{SLOT}.default` → texto genérico configurable
3. Interpola variables: `{{paciente}}`, `{{puntaje}}`, `{{percentil}}`, `{{descriptor}}`, `{{testNombre}}`

### `RulesEngineService`

Entrada: `{ reportId, sections: SectionType[], user: UserPayload }`

Por sección:

**COGNITIVE_EVALUATION (5c):**
1. Obtiene dominios activos del marco del informe
2. Por cada dominio → tests aplicados → por cada test → `TestScoreSlot` del test
3. Por cada slot: `NormativeService` (si `requiresConversion`) → `DescriptorService` → `DictionaryService`
4. Guarda `standardScore`, `scoreType`, `percentile`, `descriptor` en `TestResult`
5. Ensambla párrafo por dominio, concatena narrativa de la sección
6. Guarda en `ReportSection[COGNITIVE_EVALUATION].content` (status → `CLINICIAN_REVIEWING`)

**QUESTIONNAIRE_SYMPTOMS (5b):**
- Cuestionarios usan puntos de corte en lugar de descriptores
- Cada slot de cuestionario declara `cutoffSignificant` y `cutoffClinical` en el `TestScoreSlot`
- Motor clasifica: normal / limítrofe / clínicamente significativo → texto desde diccionario
- Claves: `BASC3.HIPERACT.clinicamente_significativo`, `BDI2.TOTAL.leve`, etc.

**SOCIAL_COGNITION (5d):**
- Solo activo en marco SNP-CHC
- ADOS-2: mapea Calibrated Severity Score (CSS 1-10) a niveles: sin_autism / leve / moderado_severo
- ADI-R: compara totales de algoritmos contra puntos de corte → en_rango / bajo_umbral
- Claves: `ADOS2.CSS.moderado_severo`, `ADIR.SOCIAL.en_rango`, etc.

**RESULTS_SYNTHESIS (6):**
- Agrega los descriptores más bajos de cada dominio cognitivo + cuestionarios + social
- Genera párrafo resumen de hallazgos principales
- Clave de diccionario: `SINTESIS.{FRAMEWORK}.base` con variables de los dominios afectados

---

## 5. API

Todos los endpoints requieren `JwtAuthGuard`.

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/descriptor-scales` | Lista escalas con rangos |
| `GET` | `/test-score-slots?testId=` | Lista slots de un test |
| `GET` | `/normative-tables?slotId=` | Lista tablas normativas |
| `POST` | `/normative-tables` | Crea tabla + carga entries desde CSV (multipart) |
| `PUT` | `/normative-tables/:id` | Actualiza metadata o reemplaza entries |
| `DELETE` | `/normative-tables/:id` | Desactiva tabla |
| `POST` | `/reports/:id/generate-sections` | Ejecuta motor para `{ sections: SectionType[] }` |

**Formato CSV para upload de baremos (lookup):**
```
ageMin,ageMax,educationYearsMin,educationYearsMax,gender,rawScoreMin,rawScoreMax,standardScore,percentile
20,29,,,,30,35,-1.5,7
20,29,,,,36,42,-1.0,16
30,39,,,,30,35,-1.3,10
```
Las columnas opcionales (`educationYearsMin`, `educationYearsMax`, `gender`) se dejan vacías si no aplican.

**Formato JSON para fórmulas (enviado en body al crear tabla de tipo formula):**
```json
{
  "entries": [
    {
      "ageMin": 20, "ageMax": 29,
      "formulaType": "z_transform",
      "parameters": { "mean": 85.3, "sd": 12.1 }
    }
  ]
}
```

---

## 6. Seed inicial

| Archivo | Contenido |
|---|---|
| `05-descriptor-scales.ts` | 4 escalas + rangos WECHSLER_SCALED y WECHSLER_SS (hardcoded); NEURO_Z y NEURO_PERCENTILE con rangos placeholder que el admin actualiza |
| `06-test-score-slots.ts` | Slots para WISC-V (5 índices + 10 subtests), WAIS-IV (4 índices + 10 subtests), TMT-A/B, WCST, TAVEC, TAVECI, CARAS-R, TFCRO, BASC-3 (escalas clínicas), ASRS-18, DEX-Sp, BAI, BDI-II, ADOS-2 (CSS), ADI-R (algoritmos) |
| `07-clinical-dictionaries.ts` | Entradas para WISC-V (ICV, IVE, MRT, IRP, IVP × 7 descriptores = 35 entradas) y WAIS-IV (igual = 35 entradas) + entradas de síntesis para ambos marcos |

Las tablas normativas NO se seedean — cada institución las carga con sus propios baremos.

---

## 7. Módulos NestJS

| Módulo | Archivo | Nota |
|---|---|---|
| `DescriptorScalesModule` | `modules/descriptor-scales/` | Solo lectura en MVP |
| `NormativeTablesModule` | `modules/normative-tables/` | CRUD + CSV upload |
| `TestScoreSlotsModule` | `modules/test-score-slots/` | Solo lectura |
| `RulesEngineModule` | `modules/rules-engine/` | Orquesta los 4 servicios |

`RulesEngineModule` importa `ReportsModule`, `NormativeTablesModule`, `DescriptorScalesModule`, y tiene acceso a `PrismaService`.

---

## 8. Casos límite

| Caso | Comportamiento |
|---|---|
| Sin tabla normativa para un slot | Usa el puntaje ingresado directamente (solo si `!requiresConversion`) |
| Sin entrada de diccionario exacta | Fallback: `{TEST}.{SLOT}.default` → texto genérico de admin |
| Puntaje fuera de rangos de escala | Usa el rango extremo más cercano, nunca lanza error |
| Dominio sin tests aplicados | La subsección no se genera (subsección condicional) |
| Demografía parcial (sin educación) | Busca entrada sin filtro de educación como fallback |
| Sección ya en estado APPROVED | Motor rechaza sobreescribir con 403 |

---

## 9. Fuera de scope en este paso

- UI de ingreso de puntajes (Paso 5)
- PDF adjunto de resultados (Paso 5)
- Tablas de anexos / gráficos (Paso 5 y 7)
- Gestión de diccionarios desde UI admin (Paso 9)
- Gestión de escalas de descriptores desde UI admin (Paso 9)
- Upload de baremos desde UI (Paso 9; en Paso 4 solo via API directa)
