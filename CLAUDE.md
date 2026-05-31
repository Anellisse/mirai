# Mirai — Plataforma de informes neuropsicológicos asistidos

> Documento de trabajo para desarrollo en consola. Fuente de verdad de diseño:
> `Mirai - Documento de Diseno.docx`. Informes de referencia reales:
> `Muestra para profesionales.docx` (infanto-juvenil) e `Informe de muestra.docx` (adultos).

## Qué es Mirai (y qué NO es)

Sistema de **apoyo a la redacción clínica** para el Centro Neuropsia. **NO** es generación
automática por IA. El profesional conserva **control absoluto** sobre el contenido final.
Todo output de IA es un **borrador editable** que el profesional revisa y aprueba.

Objetivos: reducir tiempo de redacción, disminuir errores, estandarizar, facilitar
supervisión, centralizar el repositorio con control de acceso.

## Rol limitado de la IA (regla dura)

La IA SOLO se usa para:
1. Narrativa de **Antecedentes relevantes** (desde formulario estructurado).
2. Narrativa de **Conducta observada** (desde checklist clínico).
3. **Transcripción** (no interpretación) de puntajes desde PDF, con validación obligatoria.

La IA **NUNCA**: interpreta resultados cognitivos, genera diagnósticos, redacta
conclusiones libremente, ni accede a resultados cognitivos o conclusiones.

## Dos marcos clínicos (seleccionables por informe)

El **marco** y el **instrumento de inteligencia** son independientes (un adolescente de
17 puede usar marco infanto-juvenil con WAIS-IV).

| | SNP-CHC (infanto-juvenil) | Estándar por funciones (adultos) |
|---|---|---|
| Uso | Neurodesarrollo, hasta ~30 años | Lesión, neurocognitivo, psiquiátrico |
| Inteligencia (default) | WISC-V | WAIS-IV |
| Organización | 4 ejes jerárquicos | Funciones planas |
| Cognición social | ADOS-2, ADI-R | No aplica |
| Cuestionarios | BASC-3 | ASRS-18, DEX-Sp, BAI, BDI-II |

**SNP-CHC — 4 ejes:** (1) Sensoriomotor y praxias; (2) Procesos cognitivos
(visuoespacial, memoria episódica verbal/visual, funciones ejecutivas); (3) Facilitadores
e inhibidores (atención, memoria de trabajo, velocidad de procesamiento); (4) Conocimiento
adquirido (lenguaje).

**Estándar — funciones planas:** sensoriomotor, visuoespacial, atención, lenguaje,
memoria, funciones ejecutivas, inteligencia.

## Estructura del informe (común a ambos marcos)

| N° | Sección | Origen |
|---|---|---|
| 1 | Datos de identificación | Formulario + plantilla |
| 2 | Motivo de consulta | Texto estructurado/libre |
| 3 | Antecedentes relevantes | Formulario → **IA** |
| 4 | Procedimiento y pruebas aplicadas | Selección de batería → reglas |
| 5a | Conducta observada | Checklist → **IA** |
| 5b | Sintomatología en cuestionarios | Importación PDF → reglas |
| 5c | Evaluación cognitiva | Puntajes → **diccionario de reglas** |
| 5d | Cognición social (si aplica) | ADOS-2/ADI-R → diccionario |
| 6 | Síntesis de resultados | Reglas + edición manual |
| 7 | Conclusiones | Formulario clínico → borrador editable |
| 8 | Recomendaciones | Biblioteca + reglas de activación |
| 9 | Anexos | Tablas + gráficos automáticos |

### Reglas clínicas especiales (NO IA)
- **Omisión del CIT**: en perfil disarmónico, omitir CIT e insertar frase estándar.
- **Subsección condicional**: dominio sin instrumentos aplicados → no aparece.
- **Advertencia legal** en anexos (texto fijo configurable).
- **Bloque de firma**: nombre, título, registro, fecha.
- **Branding editable**: subtítulo del centro varía entre informes.

## Selección flexible de instrumentos

Batería NO fija. Catálogo extensible por admin (sin código). El informe pide puntajes solo
de lo seleccionado. Catálogo inicial: WISC-V, WAIS-IV, TFCRO, TAVEC/TAVECI, WCST, TMT,
CARAS-R, ADOS-2, ADI-R, BASC-3, ASRS-18, DEX-Sp, BAI, BDI-II.

## Importación de puntajes desde PDF

Fuentes: **Q-global** (Pearson), **TEAcorrige** (TEA), **CEDETI UC**. Todas en PDF, layouts
distintos. Extracción **asistida con validación obligatoria** (transcripción ≠ interpretación).
Flujo: subir PDF → indicar fuente → sistema propone valores → profesional confirma/corrige
lado a lado → PDF queda adjunto (encriptado, con hash) → valores alimentan tablas/gráficos.

Fases: **MVP** = ingreso manual asistido + PDF adjunto. **Fase 2** = extracción automática
Q-global. **Fase 3** = TEAcorrige y CEDETI. (Pedir PDFs de ejemplo anonimizados en Fase 2.)

## Gráficos de perfil

- **Barras horizontales** para índices WISC-V/WAIS-IV (escala nativa, media 100).
- **Radar** para perfil global por dominios del marco activo.
- Normalización a escala común (1-5: Muy bajo → Muy alto) como regla transparente.
- Incrustables en secciones y anexos; el profesional decide si incluirlos.

## Ciclo de vida del informe

`DRAFT → IN_PROGRESS → REVIEW → [SUPERVISOR_REVIEW] → APPROVED → EXPORTED → FINAL`

- **Regla crítica**: no se pasa a APPROVED si una sección de IA no fue revisada/confirmada.
- **FINAL**: PDF oficial inmutable. Opción A (PDF del sistema) u Opción B (PDF editado
  subido). Requiere firma + confirmación de revisión. Cambios → nueva versión (v2).
  Hash SHA-256 para integridad. Disponible para consulta futura del paciente.

## Roles y control de acceso

| Rol | Capacidades |
|---|---|
| Super Admin | Acceso total, configuración, auditoría |
| Admin | Ver todos los informes, aprobar accesos, gestionar usuarios |
| Clínico Senior | Crear informes, ver propios, exportar sin supervisión |
| Clínico | Crear informes, ver propios, requiere supervisor para exportar |
| Supervisor | Revisar/aprobar/comentar informes asignados |

**Repositorio**: todas ven que un informe existe (fecha, profesional, estado, nombre de
paciente parcialmente oculto). Para abrir un informe ajeno → **solicitud de acceso**:
solicita con motivo → admin recibe notificación (plataforma + email) → aprueba (temporal
24h/48h o permanente) o rechaza con motivo → todo queda en auditoría.

## Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | Next.js + TypeScript + Tailwind + shadcn/ui |
| Backend | NestJS + TypeScript |
| BD / ORM | PostgreSQL + Prisma |
| Auth | Auth.js (2FA obligatorio para admins) |
| Gráficos | Recharts / Chart.js (export a imagen para Word) |
| Export | docx + PDF |
| Infra | Docker Compose + Nginx (TLS), servidor propio |

## Seguridad (datos de salud confidenciales, servidor propio)

- **Auth**: bcrypt (≥12), 2FA admins, expiración de sesión, bloqueo por intentos.
- **Authz**: RBAC por endpoint, permisos a nivel de recurso, AccessGrant para ajenos.
- **Tránsito**: HTTPS/TLS 1.3, HSTS, sin datos sensibles en query params.
- **Reposo**: encriptar RUT, diagnósticos, medicación, hospitalizaciones, hipótesis;
  archivos encriptados.
- **Auditoría**: log inmutable (append-only) de accesos/cambios/solicitudes/exportaciones.
- **Infra**: Docker red privada, secretos en env, rate limiting, CORS estricto, CSP,
  PostgreSQL no expuesto, firewall solo 80/443.
- **Archivos**: directorio no público, URLs firmadas temporales, hash SHA-256, validación MIME.
- **Continuidad**: backups diarios encriptados + **backup externo** (NAS/nube cifrada) +
  pruebas de restauración. Soft delete; retención ≥5 años (legislación chilena de salud).

## Escala

~6 profesionales, ~7 pacientes/mes, procesos de ~5 semanas. Escala pequeña y predecible.
Foco en robustez, seguridad y UX — no en escalado masivo.

## Estructura del monorepo

```
apps/
  web/   Next.js (App Router): (auth), (dashboard)/{repository,patients,
         reports/[id]/{interview,evaluation,observation,editor,recommendations,finalize}},
         admin/{users,access-requests,dictionaries,recommendations,templates,audit-log}
  api/   NestJS modules/{auth,users,patients,reports,repository,access-control,interview,
         evaluation,observation,dictionary,recommendations,ai,import,charts,export,
         finalize,audit,notifications}
packages/  shared-types, clinical-constants
prisma/    schema.prisma + seed/{frameworks,snp-chc-domains,tests-catalog,
           dictionaries,recommendations}
storage/   (no público) final-reports, imported-pdfs, temp-exports
docker/    docker-compose.yml + Nginx + Dockerfiles
docs/      documento de diseño y especificaciones
```

## Entidades de datos clave (Prisma)

`Organization`, `User` (role), `Patient`, `Report` (status, version, framework_id,
selected_tests, omit_cit, locked_by), `ReportSection` (section_type, status, content,
source_data, generated_by, ai_raw_output, clinician_edited, approved_by),
`EvaluationFramework`, `CognitiveDomain` (axis), `CognitiveTest` (type,
applicable_frameworks, requires_informant), `TestResult` (descriptor),
`InterviewForm`, `ObservationChecklist`, `ClinicalDictionary` (+ `DictionaryHistory`),
`RecommendationBlock` / `RecommendationRule` / `ReportRecommendation`,
`ClinicalConclusion` / `DiagnosticHypothesis`, `ImportedScoreReport` (source, pdf_hash,
raw_extracted_data, validated_data), `AccessRequest` / `AccessGrant`, `FinalReport`
(source, file_hash, finalized_by, signature), `AuditLog` (append-only).

## Roadmap MVP

1. Monorepo + Prisma schema + auth y roles.
2. CRUD pacientes + máquina de estados del informe.
3. Formularios: antecedentes, conducta, conclusiones.
4. Motor de reglas + diccionarios clínicos (seed).
5. Ingreso de puntajes + PDF adjunto + tablas de anexos.
6. Borrador asistido por IA (antecedentes y conducta).
7. Editor por sección + aprobación + gráficos.
8. Export Word/PDF + etapa de informe final.
9. Repositorio + control de acceso + auditoría.
10. Endurecimiento de seguridad + backups + despliegue.

## Decisiones abiertas / pendientes
- Editor de texto del informe: rich text (TipTap recomendado) vs Markdown.
- Catálogo de diagnósticos: CIE-11/DSM-5 vs catálogo propio simplificado.
- Supervisión obligatoria u opcional por organización.
- Normas/baremos: ¿el sistema calcula descriptores desde puntajes o el clínico los ingresa?
- Branding: subir logo Neuropsia para cabecera de informes exportados.

## Convenciones
- Español clínico formal en toda la salida de informes.
- Nunca hardcodear textos clínicos: van en diccionarios/bibliotecas editables en BD.
- Nada de IA en resultados cognitivos, conclusiones ni recomendaciones.
