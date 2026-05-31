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

Seis escalas. Los rangos de `NEURO_Z` y `NEURO_PERCENTILE` los define el admin (Sociedad Americana de Neuropsicología). WISC-V y WAIS-IV usan **labels distintos** aunque los rangos numéricos sean iguales, por eso tienen escalas separadas.

| Código | Aplica a | Labels (de menor a mayor) |
|---|---|---|
| `NEURO_Z` | Z-scores (tests neuropsicológicos generales) | Definidos por admin |
| `NEURO_PERCENTILE` | Percentiles | Definidos por admin (mismos labels que NEURO_Z) |
| `WISC_SS` | Índices compuestos WISC-V (SS, media 100) | Extremadamente bajo · Limítrofe · Medio bajo · Medio · Medio alto · Superior · Muy alto |
| `WISC_SCALED` | Escalares subtests WISC-V (media 10) | Extremadamente bajo · Limítrofe · Medio bajo · Medio · Medio alto · Superior · Muy alto |
| `WAIS_SS` | Índices compuestos WAIS-IV (SS, media 100) | Muy bajo · Limítrofe · Bajo el promedio · Promedio · Alto · Superior · Muy superior |
| `WAIS_SCALED` | Escalares subtests WAIS-IV (media 10) | Muy bajo · Limítrofe · Bajo el promedio · Promedio · Alto · Superior · Muy superior |

**Rangos numéricos WISC_SS y WAIS_SS (iguales, labels distintos):**

| Rango SS | Label WISC-V | Label WAIS-IV |
|---|---|---|
| ≥ 130 | Muy alto | Muy superior |
| 120–129 | Superior | Superior |
| 110–119 | Medio alto | Alto |
| 90–109 | Medio | Promedio |
| 80–89 | Medio bajo | Bajo el promedio |
| 70–79 | Limítrofe | Limítrofe |
| ≤ 69 | Extremadamente bajo | Muy bajo |

**Rangos numéricos WISC_SCALED y WAIS_SCALED (iguales, labels iguales a sus respectivos SS):**

| Rango escalar | Label WISC-V | Label WAIS-IV |
|---|---|---|
| 17–19 | Muy alto | Muy superior |
| 14–16 | Superior | Superior |
| 12–13 | Medio alto | Alto |
| 8–11 | Medio | Promedio |
| 6–7 | Medio bajo | Bajo el promedio |
| 4–5 | Limítrofe | Limítrofe |
| 1–3 | Extremadamente bajo | Muy bajo |

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

## 9. Textos borrador para diccionario clínico (seed 07)

Variables disponibles: `{{paciente}}`, `{{puntaje}}` (SS o escalar), `{{percentil}}`, `{{descriptor}}`.

### WISC-V — Índices compuestos

**ICV — Índice de Comprensión Verbal**

| Descriptor | Código | Texto borrador |
|---|---|---|
| Muy alto | `WISC5.ICV.muy_alto` | "El Índice de Comprensión Verbal (ICV) de {{paciente}} se ubica en el rango Muy alto (SS = {{puntaje}}; Pc {{percentil}}), evidenciando un desarrollo destacado de las habilidades verbales. Muestra una sólida capacidad para comprender y expresar conceptos verbales complejos, razonar con el lenguaje y evocar conocimiento adquirido." |
| Superior | `WISC5.ICV.superior` | "El Índice de Comprensión Verbal (ICV) se sitúa en el rango Superior (SS = {{puntaje}}; Pc {{percentil}}), reflejando habilidades verbales bien desarrolladas que superan a la mayoría de sus pares. Destaca en la comprensión del lenguaje, el razonamiento verbal y la expresión de conceptos." |
| Medio alto | `WISC5.ICV.medio_alto` | "El Índice de Comprensión Verbal (ICV) se ubica en el rango Medio alto (SS = {{puntaje}}; Pc {{percentil}}), indicando habilidades verbales por sobre el promedio. La comprensión del lenguaje, el razonamiento verbal y el vocabulario se encuentran adecuadamente desarrollados." |
| Medio | `WISC5.ICV.medio` | "El Índice de Comprensión Verbal (ICV) se sitúa en el rango Medio (SS = {{puntaje}}; Pc {{percentil}}), acorde al nivel esperado para su edad. La comprensión del lenguaje oral, el razonamiento verbal y el manejo del vocabulario se encuentran dentro de los parámetros normativos." |
| Medio bajo | `WISC5.ICV.medio_bajo` | "El Índice de Comprensión Verbal (ICV) se ubica en el rango Medio bajo (SS = {{puntaje}}; Pc {{percentil}}), evidenciando un desarrollo de las habilidades verbales por debajo del promedio esperado para su edad. Se observan dificultades relativas en la comprensión del lenguaje, el razonamiento verbal y/o la expresión de conceptos." |
| Limítrofe | `WISC5.ICV.limitrofe` | "El Índice de Comprensión Verbal (ICV) se sitúa en el rango Limítrofe (SS = {{puntaje}}; Pc {{percentil}}), indicando un desarrollo verbal significativamente inferior al esperado. Las habilidades de comprensión del lenguaje, razonamiento verbal y vocabulario se encuentran considerablemente disminuidas respecto a su grupo de referencia." |
| Extremadamente bajo | `WISC5.ICV.extremadamente_bajo` | "El Índice de Comprensión Verbal (ICV) se ubica en el rango Extremadamente bajo (SS = {{puntaje}}; Pc {{percentil}}), evidenciando un desarrollo verbal muy por debajo del esperado para su edad. Las habilidades de comprensión del lenguaje, razonamiento verbal y expresión conceptual presentan compromisos significativos que requieren atención especializada." |

**IVE — Índice Visuoespacial**

| Descriptor | Código | Texto borrador |
|---|---|---|
| Muy alto | `WISC5.IVE.muy_alto` | "El Índice Visuoespacial (IVE) se ubica en el rango Muy alto (SS = {{puntaje}}; Pc {{percentil}}), evidenciando una capacidad sobresaliente para analizar, sintetizar y reproducir información visual y espacial. El procesamiento visoperceptivo y la organización espacial son fortalezas destacadas." |
| Superior | `WISC5.IVE.superior` | "El Índice Visuoespacial (IVE) se sitúa en el rango Superior (SS = {{puntaje}}; Pc {{percentil}}), reflejando habilidades visoespaciales bien por sobre el promedio. Muestra adecuada capacidad para analizar relaciones espaciales y reproducir configuraciones visuales complejas." |
| Medio alto | `WISC5.IVE.medio_alto` | "El Índice Visuoespacial (IVE) se ubica en el rango Medio alto (SS = {{puntaje}}; Pc {{percentil}}), indicando habilidades visoespaciales sobre el promedio esperado para su edad." |
| Medio | `WISC5.IVE.medio` | "El Índice Visuoespacial (IVE) se sitúa en el rango Medio (SS = {{puntaje}}; Pc {{percentil}}), acorde al nivel esperado para su edad. El análisis visoespacial y la construcción de figuras a partir de modelos se encuentran dentro de parámetros normativos." |
| Medio bajo | `WISC5.IVE.medio_bajo` | "El Índice Visuoespacial (IVE) se ubica en el rango Medio bajo (SS = {{puntaje}}; Pc {{percentil}}), indicando dificultades relativas en el procesamiento visoespacial. Se observan limitaciones en el análisis de relaciones espaciales y/o la reproducción de configuraciones visuales." |
| Limítrofe | `WISC5.IVE.limitrofe` | "El Índice Visuoespacial (IVE) se sitúa en el rango Limítrofe (SS = {{puntaje}}; Pc {{percentil}}), evidenciando compromisos significativos en el procesamiento visoespacial que se alejan considerablemente del promedio esperado para su edad." |
| Extremadamente bajo | `WISC5.IVE.extremadamente_bajo` | "El Índice Visuoespacial (IVE) se ubica en el rango Extremadamente bajo (SS = {{puntaje}}; Pc {{percentil}}), evidenciando compromisos severos en el análisis y procesamiento visoespacial que requieren evaluación e intervención especializada." |

**MRT — Memoria de Trabajo**

| Descriptor | Código | Texto borrador |
|---|---|---|
| Muy alto | `WISC5.MRT.muy_alto` | "El Índice de Memoria de Trabajo (MRT) se ubica en el rango Muy alto (SS = {{puntaje}}; Pc {{percentil}}), evidenciando una capacidad sobresaliente para retener, manipular y operar con información en la memoria de trabajo. Esta constituye una fortaleza cognitiva significativa." |
| Superior | `WISC5.MRT.superior` | "El Índice de Memoria de Trabajo (MRT) se sitúa en el rango Superior (SS = {{puntaje}}; Pc {{percentil}}), reflejando una capacidad bien desarrollada para mantener y manipular información de forma activa." |
| Medio alto | `WISC5.MRT.medio_alto` | "El Índice de Memoria de Trabajo (MRT) se ubica en el rango Medio alto (SS = {{puntaje}}; Pc {{percentil}}), indicando una capacidad por sobre el promedio para retener y operar con información de forma simultánea." |
| Medio | `WISC5.MRT.medio` | "El Índice de Memoria de Trabajo (MRT) se sitúa en el rango Medio (SS = {{puntaje}}; Pc {{percentil}}), acorde al nivel esperado para su edad. La capacidad para mantener y manipular información activamente se encuentra dentro de parámetros normativos." |
| Medio bajo | `WISC5.MRT.medio_bajo` | "El Índice de Memoria de Trabajo (MRT) se ubica en el rango Medio bajo (SS = {{puntaje}}; Pc {{percentil}}), evidenciando limitaciones en la capacidad para retener y operar con información de forma activa. Esto puede impactar el seguimiento de instrucciones complejas y el aprendizaje que requiere procesamiento simultáneo." |
| Limítrofe | `WISC5.MRT.limitrofe` | "El Índice de Memoria de Trabajo (MRT) se sitúa en el rango Limítrofe (SS = {{puntaje}}; Pc {{percentil}}), evidenciando compromisos significativos en la capacidad de retención y manipulación activa de información, con impacto probable en el funcionamiento académico y cotidiano." |
| Extremadamente bajo | `WISC5.MRT.extremadamente_bajo` | "El Índice de Memoria de Trabajo (MRT) se ubica en el rango Extremadamente bajo (SS = {{puntaje}}; Pc {{percentil}}), evidenciando compromisos severos en la memoria de trabajo que afectan de manera importante la capacidad de aprendizaje y el funcionamiento ejecutivo general." |

**IRP — Índice de Razonamiento Fluido**

| Descriptor | Código | Texto borrador |
|---|---|---|
| Muy alto | `WISC5.IRP.muy_alto` | "El Índice de Razonamiento Fluido (IRP) se ubica en el rango Muy alto (SS = {{puntaje}}; Pc {{percentil}}), evidenciando una capacidad sobresaliente para identificar patrones, razonar inductivamente y resolver problemas novedosos sin apoyo del conocimiento previo." |
| Superior | `WISC5.IRP.superior` | "El Índice de Razonamiento Fluido (IRP) se sitúa en el rango Superior (SS = {{puntaje}}; Pc {{percentil}}), reflejando una capacidad bien desarrollada para el razonamiento lógico-abstracto y la resolución de problemas novedosos." |
| Medio alto | `WISC5.IRP.medio_alto` | "El Índice de Razonamiento Fluido (IRP) se ubica en el rango Medio alto (SS = {{puntaje}}; Pc {{percentil}}), indicando una capacidad de razonamiento abstracto y resolución de problemas por sobre el promedio." |
| Medio | `WISC5.IRP.medio` | "El Índice de Razonamiento Fluido (IRP) se sitúa en el rango Medio (SS = {{puntaje}}; Pc {{percentil}}), acorde al nivel esperado para su edad. La capacidad para identificar relaciones, razonar inductivamente y resolver problemas nuevos se encuentra dentro de parámetros normativos." |
| Medio bajo | `WISC5.IRP.medio_bajo` | "El Índice de Razonamiento Fluido (IRP) se ubica en el rango Medio bajo (SS = {{puntaje}}; Pc {{percentil}}), evidenciando dificultades relativas en el razonamiento abstracto y la resolución de problemas novedosos, por debajo de lo esperado para su edad." |
| Limítrofe | `WISC5.IRP.limitrofe` | "El Índice de Razonamiento Fluido (IRP) se sitúa en el rango Limítrofe (SS = {{puntaje}}; Pc {{percentil}}), evidenciando compromisos significativos en la capacidad de razonamiento lógico-abstracto e inductivo." |
| Extremadamente bajo | `WISC5.IRP.extremadamente_bajo` | "El Índice de Razonamiento Fluido (IRP) se ubica en el rango Extremadamente bajo (SS = {{puntaje}}; Pc {{percentil}}), evidenciando compromisos severos en el razonamiento abstracto y fluido que impactan de manera importante en la capacidad de resolución de problemas." |

**IVP — Índice de Velocidad de Procesamiento**

| Descriptor | Código | Texto borrador |
|---|---|---|
| Muy alto | `WISC5.IVP.muy_alto` | "El Índice de Velocidad de Procesamiento (IVP) se ubica en el rango Muy alto (SS = {{puntaje}}; Pc {{percentil}}), evidenciando una velocidad sobresaliente para procesar información visual simple de forma rápida y eficiente." |
| Superior | `WISC5.IVP.superior` | "El Índice de Velocidad de Procesamiento (IVP) se sitúa en el rango Superior (SS = {{puntaje}}; Pc {{percentil}}), reflejando una velocidad de procesamiento visomotor bien desarrollada." |
| Medio alto | `WISC5.IVP.medio_alto` | "El Índice de Velocidad de Procesamiento (IVP) se ubica en el rango Medio alto (SS = {{puntaje}}; Pc {{percentil}}), indicando una velocidad de procesamiento de información visual por sobre el promedio esperado." |
| Medio | `WISC5.IVP.medio` | "El Índice de Velocidad de Procesamiento (IVP) se sitúa en el rango Medio (SS = {{puntaje}}; Pc {{percentil}}), acorde al nivel esperado para su edad. La velocidad para escanear, identificar y ejecutar tareas visuales simples se encuentra dentro de parámetros normativos." |
| Medio bajo | `WISC5.IVP.medio_bajo` | "El Índice de Velocidad de Procesamiento (IVP) se ubica en el rango Medio bajo (SS = {{puntaje}}; Pc {{percentil}}), evidenciando una velocidad de procesamiento de información visual y motora por debajo del promedio, lo que puede impactar el rendimiento en tareas que requieren rapidez y eficiencia." |
| Limítrofe | `WISC5.IVP.limitrofe` | "El Índice de Velocidad de Procesamiento (IVP) se sitúa en el rango Limítrofe (SS = {{puntaje}}; Pc {{percentil}}), evidenciando compromisos significativos en la velocidad con que procesa y responde ante información visual simple." |
| Extremadamente bajo | `WISC5.IVP.extremadamente_bajo` | "El Índice de Velocidad de Procesamiento (IVP) se ubica en el rango Extremadamente bajo (SS = {{puntaje}}; Pc {{percentil}}), evidenciando una velocidad de procesamiento muy lenta que impacta de manera transversal el rendimiento cognitivo general." |

---

### WAIS-IV — Índices compuestos

**ICV — Índice de Comprensión Verbal**

| Descriptor | Código | Texto borrador |
|---|---|---|
| Muy superior | `WAIS4.ICV.muy_superior` | "El Índice de Comprensión Verbal (ICV) de {{paciente}} se ubica en el rango Muy superior (SS = {{puntaje}}; Pc {{percentil}}), evidenciando un desarrollo sobresaliente de las habilidades verbales. Muestra una sólida capacidad para razonar con el lenguaje, comprender conceptos abstractos y evocar conocimiento cristalizado." |
| Superior | `WAIS4.ICV.superior` | "El Índice de Comprensión Verbal (ICV) se sitúa en el rango Superior (SS = {{puntaje}}; Pc {{percentil}}), reflejando habilidades verbales bien desarrolladas que superan a la mayoría de sus pares. Destaca en comprensión del lenguaje, razonamiento verbal y vocabulario." |
| Alto | `WAIS4.ICV.alto` | "El Índice de Comprensión Verbal (ICV) se ubica en el rango Alto (SS = {{puntaje}}; Pc {{percentil}}), indicando habilidades verbales por sobre el promedio. La comprensión del lenguaje oral, el razonamiento verbal y el manejo del vocabulario están bien desarrollados." |
| Promedio | `WAIS4.ICV.promedio` | "El Índice de Comprensión Verbal (ICV) se sitúa en el rango Promedio (SS = {{puntaje}}; Pc {{percentil}}), acorde al nivel esperado. La comprensión del lenguaje, el razonamiento verbal y el vocabulario se encuentran dentro de parámetros normativos." |
| Bajo el promedio | `WAIS4.ICV.bajo_promedio` | "El Índice de Comprensión Verbal (ICV) se ubica en el rango Bajo el promedio (SS = {{puntaje}}; Pc {{percentil}}), evidenciando un rendimiento verbal inferior al esperado. Se observan dificultades relativas en la comprensión del lenguaje, el razonamiento verbal y/o la expresión de conceptos." |
| Limítrofe | `WAIS4.ICV.limitrofe` | "El Índice de Comprensión Verbal (ICV) se sitúa en el rango Limítrofe (SS = {{puntaje}}; Pc {{percentil}}), indicando compromisos significativos en las habilidades verbales que se alejan considerablemente del promedio." |
| Muy bajo | `WAIS4.ICV.muy_bajo` | "El Índice de Comprensión Verbal (ICV) se ubica en el rango Muy bajo (SS = {{puntaje}}; Pc {{percentil}}), evidenciando compromisos severos en las habilidades verbales, incluyendo comprensión del lenguaje, razonamiento verbal y vocabulario." |

**IRP — Índice de Razonamiento Perceptual**

| Descriptor | Código | Texto borrador |
|---|---|---|
| Muy superior | `WAIS4.IRP.muy_superior` | "El Índice de Razonamiento Perceptual (IRP) se ubica en el rango Muy superior (SS = {{puntaje}}; Pc {{percentil}}), evidenciando una capacidad sobresaliente para analizar información visual, identificar relaciones espaciales y resolver problemas no verbales de manera eficiente." |
| Superior | `WAIS4.IRP.superior` | "El Índice de Razonamiento Perceptual (IRP) se sitúa en el rango Superior (SS = {{puntaje}}; Pc {{percentil}}), reflejando habilidades visoperceptivas y de razonamiento no verbal bien por sobre el promedio." |
| Alto | `WAIS4.IRP.alto` | "El Índice de Razonamiento Perceptual (IRP) se ubica en el rango Alto (SS = {{puntaje}}; Pc {{percentil}}), indicando habilidades de razonamiento visoespacial y perceptivo por sobre el promedio esperado." |
| Promedio | `WAIS4.IRP.promedio` | "El Índice de Razonamiento Perceptual (IRP) se sitúa en el rango Promedio (SS = {{puntaje}}; Pc {{percentil}}), acorde al nivel esperado. La capacidad para analizar información visual y resolver problemas no verbales se encuentra dentro de parámetros normativos." |
| Bajo el promedio | `WAIS4.IRP.bajo_promedio` | "El Índice de Razonamiento Perceptual (IRP) se ubica en el rango Bajo el promedio (SS = {{puntaje}}; Pc {{percentil}}), evidenciando dificultades relativas en el razonamiento visoperceptivo y la resolución de problemas no verbales." |
| Limítrofe | `WAIS4.IRP.limitrofe` | "El Índice de Razonamiento Perceptual (IRP) se sitúa en el rango Limítrofe (SS = {{puntaje}}; Pc {{percentil}}), evidenciando compromisos significativos en el razonamiento visoperceptivo y espacial." |
| Muy bajo | `WAIS4.IRP.muy_bajo` | "El Índice de Razonamiento Perceptual (IRP) se ubica en el rango Muy bajo (SS = {{puntaje}}; Pc {{percentil}}), evidenciando compromisos severos en la capacidad de razonamiento visoperceptivo y espacial." |

**MT — Memoria de Trabajo**

| Descriptor | Código | Texto borrador |
|---|---|---|
| Muy superior | `WAIS4.MT.muy_superior` | "El Índice de Memoria de Trabajo (MT) se ubica en el rango Muy superior (SS = {{puntaje}}; Pc {{percentil}}), evidenciando una capacidad sobresaliente para mantener y manipular activamente información en la memoria de corto plazo." |
| Superior | `WAIS4.MT.superior` | "El Índice de Memoria de Trabajo (MT) se sitúa en el rango Superior (SS = {{puntaje}}; Pc {{percentil}}), reflejando una capacidad bien desarrollada para retener y operar con información de forma activa." |
| Alto | `WAIS4.MT.alto` | "El Índice de Memoria de Trabajo (MT) se ubica en el rango Alto (SS = {{puntaje}}; Pc {{percentil}}), indicando una capacidad por sobre el promedio para mantener y manipular información simultáneamente." |
| Promedio | `WAIS4.MT.promedio` | "El Índice de Memoria de Trabajo (MT) se sitúa en el rango Promedio (SS = {{puntaje}}; Pc {{percentil}}), acorde al nivel esperado. La capacidad para mantener y operar con información de forma activa se encuentra dentro de parámetros normativos." |
| Bajo el promedio | `WAIS4.MT.bajo_promedio` | "El Índice de Memoria de Trabajo (MT) se ubica en el rango Bajo el promedio (SS = {{puntaje}}; Pc {{percentil}}), evidenciando limitaciones en la capacidad de retención y manipulación activa de información, con posible impacto en tareas que requieren procesamiento simultáneo." |
| Limítrofe | `WAIS4.MT.limitrofe` | "El Índice de Memoria de Trabajo (MT) se sitúa en el rango Limítrofe (SS = {{puntaje}}; Pc {{percentil}}), evidenciando compromisos significativos en la memoria de trabajo con impacto probable en el funcionamiento ejecutivo y el aprendizaje." |
| Muy bajo | `WAIS4.MT.muy_bajo` | "El Índice de Memoria de Trabajo (MT) se ubica en el rango Muy bajo (SS = {{puntaje}}; Pc {{percentil}}), evidenciando compromisos severos en la capacidad de retención y manipulación activa de información." |

**VP — Velocidad de Procesamiento**

| Descriptor | Código | Texto borrador |
|---|---|---|
| Muy superior | `WAIS4.VP.muy_superior` | "El Índice de Velocidad de Procesamiento (VP) se ubica en el rango Muy superior (SS = {{puntaje}}; Pc {{percentil}}), evidenciando una velocidad sobresaliente para procesar y responder ante información visual simple de manera rápida y precisa." |
| Superior | `WAIS4.VP.superior` | "El Índice de Velocidad de Procesamiento (VP) se sitúa en el rango Superior (SS = {{puntaje}}; Pc {{percentil}}), reflejando una velocidad de procesamiento visomotor bien desarrollada." |
| Alto | `WAIS4.VP.alto` | "El Índice de Velocidad de Procesamiento (VP) se ubica en el rango Alto (SS = {{puntaje}}; Pc {{percentil}}), indicando una velocidad de procesamiento de información visual por sobre el promedio esperado." |
| Promedio | `WAIS4.VP.promedio` | "El Índice de Velocidad de Procesamiento (VP) se sitúa en el rango Promedio (SS = {{puntaje}}; Pc {{percentil}}), acorde al nivel esperado. La velocidad para escanear, identificar y ejecutar tareas visuales simples se encuentra dentro de parámetros normativos." |
| Bajo el promedio | `WAIS4.VP.bajo_promedio` | "El Índice de Velocidad de Procesamiento (VP) se ubica en el rango Bajo el promedio (SS = {{puntaje}}; Pc {{percentil}}), evidenciando una velocidad de procesamiento de información visual y motora por debajo del promedio, lo que puede afectar el rendimiento en tareas que requieren rapidez y eficiencia." |
| Limítrofe | `WAIS4.VP.limitrofe` | "El Índice de Velocidad de Procesamiento (VP) se sitúa en el rango Limítrofe (SS = {{puntaje}}; Pc {{percentil}}), evidenciando compromisos significativos en la velocidad de procesamiento visomotor." |
| Muy bajo | `WAIS4.VP.muy_bajo` | "El Índice de Velocidad de Procesamiento (VP) se ubica en el rango Muy bajo (SS = {{puntaje}}; Pc {{percentil}}), evidenciando una velocidad de procesamiento muy lenta que impacta de manera transversal el rendimiento cognitivo." |

---

### Síntesis (sección 6)

| Código | Texto borrador |
|---|---|
| `SINTESIS.SNP_CHC.base` | "En síntesis, el perfil cognitivo de {{paciente}} muestra {{dominios_afectados}}. Los resultados deben interpretarse en el contexto del desarrollo integral del/la evaluado/a y los antecedentes clínicos relevantes." |
| `SINTESIS.ESTANDAR.base` | "En síntesis, la evaluación neuropsicológica de {{paciente}} evidencia {{dominios_afectados}}. Los hallazgos deben integrarse con la información clínica, conductual y contextual para una comprensión integral del funcionamiento cognitivo." |

---

## 11. Fuera de scope en este paso

- UI de ingreso de puntajes (Paso 5)
- PDF adjunto de resultados (Paso 5)
- Tablas de anexos / gráficos (Paso 5 y 7)
- Gestión de diccionarios desde UI admin (Paso 9)
- Gestión de escalas de descriptores desde UI admin (Paso 9)
- Upload de baremos desde UI (Paso 9; en Paso 4 solo via API directa)
