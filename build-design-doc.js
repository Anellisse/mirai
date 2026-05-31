const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
  WidthType, ShadingType, PageNumber, PageBreak, TableOfContents, VerticalAlign,
} = require(path.join(process.env.APPDATA, "npm", "node_modules", "docx"));

const NAVY = "1F3A5F";
const BLUE = "2E75B6";
const LIGHT = "D5E8F0";
const GREY = "F2F2F2";
const border = { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" };
const borders = { top: border, bottom: border, left: border, right: border };
const CW = 9360; // content width US Letter 1" margins

// ---------- helpers ----------
function H1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });
}
function H2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
}
function H3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(text)] });
}
function P(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, ...opts })],
  });
}
function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { after: 40 },
    children: typeof text === "string" ? [new TextRun(text)] : text,
  });
}
function num(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "numbers", level },
    spacing: { after: 40 },
    children: typeof text === "string" ? [new TextRun(text)] : text,
  });
}
function cell(content, { w, fill, bold, align, head } = {}) {
  const runs = Array.isArray(content) ? content : [new TextRun({ text: String(content), bold: bold || head, color: head ? "FFFFFF" : undefined })];
  return new TableCell({
    borders,
    width: { size: w, type: WidthType.DXA },
    shading: { fill: head ? BLUE : (fill || "FFFFFF"), type: ShadingType.CLEAR },
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ alignment: align || AlignmentType.LEFT, children: runs })],
  });
}
function table(widths, rows) {
  return new Table({
    width: { size: CW, type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map((r, i) =>
      new TableRow({
        tableHeader: i === 0,
        children: r.map((c, j) =>
          cell(c, { w: widths[j], head: i === 0, fill: i % 2 === 0 ? GREY : "FFFFFF" })
        ),
      })
    ),
  });
}
function spacer() { return new Paragraph({ children: [], spacing: { after: 80 } }); }

// ---------- content ----------
const children = [];

// Cover
children.push(
  new Paragraph({ spacing: { before: 2400, after: 0 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "MIRAI", bold: true, size: 96, color: NAVY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
    children: [new TextRun({ text: "Plataforma de generación asistida de informes neuropsicológicos", size: 28, color: BLUE })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 },
    children: [new TextRun({ text: "Centro Neuropsia", size: 24, italics: true, color: "595959" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
    children: [new TextRun({ text: "Documento de Análisis y Diseño", bold: true, size: 32 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
    children: [new TextRun({ text: "Versión 1.0", size: 24, color: "595959" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Mayo 2026", size: 24, color: "595959" })] }),
  new Paragraph({ children: [new PageBreak()] }),
);

// TOC
children.push(
  new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Tabla de contenidos")] }),
  new TableOfContents("Tabla de contenidos", { hyperlink: true, headingStyleRange: "1-2" }),
  new Paragraph({ children: [new PageBreak()] }),
);

// 1. Introducción
children.push(H1("1. Introducción y filosofía del sistema"));
children.push(P("Mirai es una plataforma web de apoyo a la redacción clínica para la generación de informes neuropsicológicos del Centro Neuropsia. No es un sistema de generación automática mediante inteligencia artificial: es un sistema de estructuración del juicio clínico en el que el profesional conserva el control absoluto sobre el contenido final."));
children.push(H2("1.1 Objetivos"));
[
  "Reducir el tiempo de redacción de informes.",
  "Disminuir errores de transcripción y de consistencia.",
  "Estandarizar la estructura de los informes entre profesionales.",
  "Facilitar la supervisión clínica.",
  "Mantener siempre el juicio clínico en manos del profesional.",
  "Centralizar el repositorio de informes del centro con control de acceso.",
].forEach((t) => children.push(bullet(t)));

children.push(H2("1.2 Rol limitado de la inteligencia artificial"));
children.push(P("La IA tiene una participación estrictamente acotada. Sus únicos usos permitidos son:"));
children.push(num("Generar la narrativa de Antecedentes relevantes a partir de un formulario estructurado."));
children.push(num("Generar la narrativa de Conducta observada a partir de un checklist clínico."));
children.push(num("Transcribir (no interpretar) puntajes numéricos desde PDF de plataformas externas, con validación obligatoria del profesional."));
children.push(P("La IA NUNCA interpreta resultados neuropsicológicos, NUNCA genera diagnósticos y NUNCA redacta conclusiones libremente. Todo output de IA es un borrador editable que el profesional revisa y aprueba.", { italics: true }));

children.push(H2("1.3 Principio rector"));
children.push(P("El sistema se adapta al flujo de trabajo del profesional, no al revés. Los dos informes de referencia del Centro Neuropsia (un modelo infanto-juvenil y uno de adultos) son la fuente de verdad de la estructura clínica."));

// 2. Modelos de informe
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("2. Modelos clínicos de informe"));
children.push(P("El sistema soporta dos marcos organizadores de los resultados cognitivos, seleccionables al crear el informe. El marco y el instrumento de inteligencia son independientes (un adolescente de 17 puede usar marco infanto-juvenil con WAIS-IV)."));

children.push(table([2600, 3380, 3380], [
  ["Marco", "SNP-CHC (infanto-juvenil)", "Estándar por funciones (adultos)"],
  ["Cuándo se usa", "Neurodesarrollo, hasta ~30 años", "Lesión cerebral, neurocognitivo, psiquiátrico"],
  ["Inteligencia", "WISC-V (por defecto)", "WAIS-IV (por defecto)"],
  ["Organización", "4 ejes jerárquicos", "Funciones cognitivas planas"],
  ["Cognición social", "ADOS-2, ADI-R", "No aplica"],
  ["Cuestionarios", "BASC-3", "ASRS-18, DEX-Sp, BAI, BDI-II"],
]));
children.push(spacer());

children.push(H2("2.1 Marco SNP-CHC — Ejes y dominios"));
children.push(P("Modelo Integrado de Evaluación Neuropsicológica Escolar. Cuatro ejes que se influyen mutuamente:"));
children.push(bullet("Eje 1 — Funciones sensoriomotoras y praxias: procesamiento sensorial, psicomotricidad, integración visoespacial."));
children.push(bullet("Eje 2 — Procesos cognitivos: habilidades visuoespaciales, sistemas de memoria (episódica verbal y visual), funciones ejecutivas."));
children.push(bullet("Eje 3 — Facilitadores e inhibidores: atención, memoria de trabajo, velocidad de procesamiento."));
children.push(bullet("Eje 4 — Conocimiento adquirido: habilidades lingüísticas."));
children.push(bullet("Dominios especiales: cognición social (ADOS-2/ADI-R) y cuestionarios de conducta (BASC-3)."));

children.push(H2("2.2 Marco Estándar por funciones"));
children.push(P("Organización plana de funciones clásicas: funciones sensoriomotoras, habilidades visuoespaciales, atención, lenguaje, memoria, funciones ejecutivas e inteligencia."));

children.push(H2("2.3 Estructura común del informe"));
children.push(table([700, 3200, 5460], [
  ["N°", "Sección", "Origen en Mirai"],
  ["1", "Datos de identificación", "Formulario de paciente + plantilla"],
  ["2", "Motivo de consulta", "Texto estructurado / libre"],
  ["3", "Antecedentes relevantes", "Formulario → IA genera narrativa"],
  ["4", "Procedimiento y pruebas aplicadas", "Selección de batería → reglas"],
  ["5a", "Conducta observada", "Checklist → IA genera narrativa"],
  ["5b", "Sintomatología en cuestionarios", "Importación de puntajes → reglas"],
  ["5c", "Evaluación cognitiva", "Puntajes → diccionario de reglas"],
  ["5d", "Cognición social (si aplica)", "ADOS-2/ADI-R → diccionario especializado"],
  ["6", "Síntesis de resultados", "Reglas + edición manual"],
  ["7", "Conclusiones", "Formulario clínico → borrador editable"],
  ["8", "Recomendaciones", "Biblioteca + reglas de activación"],
  ["9", "Anexos", "Tablas y gráficos generados automáticamente"],
]));
children.push(spacer());
children.push(H2("2.4 Reglas clínicas especiales detectadas"));
children.push(bullet("Omisión del CIT: cuando el perfil es disarmónico, el sistema permite omitir el Coeficiente Intelectual Total e inserta automáticamente la frase explicativa estándar."));
children.push(bullet("Subsección condicional: si un dominio no tiene instrumentos aplicados, su subsección no aparece en el informe."));
children.push(bullet("Advertencia legal en anexos: texto fijo configurable sobre interpretación de puntajes."));
children.push(bullet("Bloque de firma: nombre, título, registro y fecha del profesional al cierre."));
children.push(bullet("Branding editable: el subtítulo del centro varía entre informes; debe ser configurable en la plantilla."));

// 3. Selección de instrumentos
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("3. Selección flexible de instrumentos"));
children.push(P("La batería no es fija. Al configurar el informe, el profesional selecciona del catálogo solo los instrumentos que aplicará. El informe pedirá puntajes únicamente de lo seleccionado, y solo aparecerán los dominios con instrumentos aplicados."));
children.push(P("Catálogo inicial (extensible por el administrador sin tocar código):"));
children.push(table([3120, 3120, 3120], [
  ["Infanto-juvenil", "Adultos", "Comunes / ambos"],
  ["WISC-V", "WAIS-IV", "TFCRO"],
  ["TAVECI", "TAVEC", "WCST"],
  ["CARAS-R", "TMT", "Entrevista clínica"],
  ["ADOS-2 / ADI-R", "ASRS-18 / DEX-Sp", "—"],
  ["BASC-3", "BAI / BDI-II", "—"],
]));

// 4. Arquitectura
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("4. Arquitectura técnica"));
children.push(H2("4.1 Stack tecnológico"));
children.push(table([2600, 6760], [
  ["Capa", "Tecnología"],
  ["Frontend", "Next.js + TypeScript + Tailwind CSS + shadcn/ui"],
  ["Backend", "NestJS + TypeScript"],
  ["Base de datos", "PostgreSQL"],
  ["ORM", "Prisma"],
  ["Autenticación", "Auth.js (2FA para administradores)"],
  ["Gráficos", "Recharts / Chart.js (export a imagen para Word)"],
  ["Exportación", "docx (Word) + generación de PDF"],
  ["Infraestructura", "Docker Compose + Nginx (TLS) en servidor propio"],
]));
children.push(spacer());
children.push(H2("4.2 Módulos del backend"));
children.push(table([3000, 6360], [
  ["Módulo", "Responsabilidad"],
  ["AuthModule", "Autenticación, sesiones, 2FA, roles"],
  ["UsersModule", "Usuarios y perfiles profesionales"],
  ["PatientsModule", "CRUD de pacientes"],
  ["ReportsModule", "Orquestación del informe, máquina de estados"],
  ["RepositoryModule", "Repositorio de informes y visibilidad por permisos"],
  ["AccessControlModule", "Solicitudes y concesiones de acceso"],
  ["InterviewModule", "Formulario de antecedentes"],
  ["EvaluationModule", "Puntajes cognitivos, cuestionarios, cognición social"],
  ["ObservationModule", "Checklist de conducta observada"],
  ["RulesEngine", "Motor de reglas para resultados cognitivos"],
  ["DictionaryModule", "Diccionarios clínicos y versionado"],
  ["RecommendationsModule", "Biblioteca y reglas de recomendaciones"],
  ["AIModule", "Integración IA (solo antecedentes y conducta)"],
  ["ImportModule", "Importación de PDF de Q-global, TEAcorrige, CEDETI"],
  ["ChartModule", "Generación de gráficos de perfil"],
  ["ExportModule", "Generación de Word y PDF"],
  ["FinalizeModule", "Etapa de informe final inmutable"],
  ["AuditModule", "Registro inmutable de acciones clínicas"],
  ["NotificationsModule", "Notificaciones de solicitudes de acceso"],
]));

// 5. Roles
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("5. Roles y control de acceso"));
children.push(table([2600, 6760], [
  ["Rol", "Capacidades"],
  ["Super Admin", "Acceso total, configuración del sistema, auditoría completa"],
  ["Admin", "Ver todos los informes, aprobar accesos, gestionar usuarios"],
  ["Clínico Senior", "Crear informes, ver los propios, exportar sin supervisión"],
  ["Clínico", "Crear informes, ver los propios, requiere supervisor para exportar"],
  ["Supervisor", "Revisar y aprobar informes asignados, comentar"],
]));
children.push(spacer());
children.push(H2("5.1 Repositorio y solicitud de acceso"));
children.push(P("Todas las profesionales ven que un informe existe (fecha, profesional, estado, nombre del paciente parcialmente oculto). Para abrir el contenido de un informe ajeno, deben solicitar acceso:"));
children.push(num("La profesional solicita acceso indicando el motivo."));
children.push(num("El administrador recibe notificación (plataforma + email)."));
children.push(num("El administrador aprueba (acceso temporal de 24h/48h o permanente) o rechaza con motivo."));
children.push(num("Todo queda registrado en auditoría: quién accedió, cuándo y por qué."));

// 6. Ciclo de vida
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("6. Ciclo de vida del informe"));
children.push(table([2400, 6960], [
  ["Estado", "Descripción"],
  ["DRAFT", "Se crea el informe y se vincula el paciente."],
  ["IN_PROGRESS", "Se completan formularios, puntajes y checklists; se generan borradores."],
  ["REVIEW", "El clínico revisa y aprueba sección por sección."],
  ["SUPERVISOR_REVIEW", "(Opcional) El supervisor revisa, comenta y aprueba o devuelve."],
  ["APPROVED", "Informe aprobado; puede exportarse."],
  ["EXPORTED", "Se generó Word/PDF; pudo editarse externamente."],
  ["FINAL", "PDF oficial almacenado e inmutable, con firma del profesional."],
]));
children.push(spacer());
children.push(P("Regla crítica: no se puede pasar a APPROVED si alguna sección generada por IA no fue revisada y editada/confirmada por el profesional.", { bold: true }));
children.push(H2("6.1 Etapa de Informe Final"));
children.push(bullet("Opción A: guardar el PDF generado por el sistema como versión oficial."));
children.push(bullet("Opción B: subir un PDF editado externamente como versión oficial."));
children.push(bullet("Requiere firma del profesional (nombre, cargo, registro) y confirmación explícita de revisión."));
children.push(bullet("Una vez en FINAL el contenido es inmutable; para cambios se crea una nueva versión (v2)."));
children.push(bullet("El PDF final se almacena con hash SHA-256 para verificar integridad y queda disponible para consulta futura del paciente."));

// 7. Motor de reglas y diccionarios
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("7. Motor de reglas y diccionarios clínicos"));
children.push(P("Los resultados cognitivos NO usan IA. Se construyen mediante un motor de reglas declarativo y una biblioteca editable de textos clínicos, almacenada en base de datos (no codificada)."));
children.push(P("Ejemplo de entrada del diccionario:"));
children.push(table([3120, 2600, 3640], [
  ["Dominio", "Descriptor", "Texto asociado"],
  ["Memoria episódica verbal", "Promedio", "Rendimiento esperado en tareas de memoria episódica verbal."],
  ["Memoria episódica verbal", "Bajo el promedio", "Dificultades en tareas de codificación y recuperación de información verbal."],
]));
children.push(spacer());
children.push(P("Los textos admiten variables resueltas en tiempo de generación, p. ej. {{domain_label}}, {{percentile}}, {{severity}}. Cada cambio en un diccionario queda versionado y auditado. Si no existe entrada para un dominio/descriptor, la subsección se marca como pendiente para completar manualmente."));

// 8. Recomendaciones
children.push(H1("8. Sistema de recomendaciones"));
children.push(P("No usa IA. Biblioteca de bloques de recomendaciones activados por reglas según los descriptores de dominio o las hipótesis diagnósticas. El profesional puede incluir, excluir o editar cada bloque, y la biblioteca es ampliable continuamente."));
children.push(bullet("Condición por dominio: p. ej. memoria de trabajo bajo el promedio activa el bloque correspondiente."));
children.push(bullet("Condición por diagnóstico: p. ej. TEA Nivel 1 activa el bloque de habilidades sociales."));
children.push(bullet("Targets: paciente, familia, escuela/institución, profesional tratante."));

// 9. IA
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("9. Generación asistida por IA"));
children.push(P("La IA solo actúa en dos secciones narrativas (Antecedentes y Conducta observada) y en la transcripción de puntajes desde PDF. El prompt es estrictamente construido y restringido:"));
children.push(bullet("Transforma datos estructurados en narrativa clínica profesional, sin interpretar ni inferir más allá de los datos."));
children.push(bullet("No sugiere diagnósticos ni redacta conclusiones."));
children.push(bullet("Tercera persona, tono profesional y neutro, español clínico formal."));
children.push(bullet("Nunca accede a resultados cognitivos ni a conclusiones."));
children.push(bullet("Se guarda el prompt y el output crudo; el profesional siempre ve el texto en un editor."));

// 10. Importación PDF
children.push(H1("10. Importación de puntajes desde PDF"));
children.push(P("Fuentes: Q-global (Pearson), TEAcorrige (TEA Ediciones) y CEDETI UC. Todas entregan PDF con layouts distintos. La extracción es asistida con validación obligatoria del profesional — extraer un número de una tabla es transcripción, no interpretación clínica."));
children.push(num("El profesional sube el PDF e indica la fuente."));
children.push(num("El sistema extrae los puntajes candidatos."));
children.push(num("Pantalla de validación lado a lado: el profesional confirma o corrige cada valor."));
children.push(num("El PDF original queda adjunto como respaldo (encriptado, con hash)."));
children.push(num("Los valores confirmados alimentan tablas y gráficos."));
children.push(P("Implementación por fases: MVP con ingreso manual asistido + PDF adjunto; Fase 2 extracción automática para Q-global; Fase 3 TEAcorrige y CEDETI.", { italics: true }));

// 11. Gráficos
children.push(H1("11. Gráficos de perfil"));
children.push(bullet("Barras horizontales para los índices del WISC-V / WAIS-IV (escala nativa, media 100)."));
children.push(bullet("Radar / tela de araña para el perfil global por dominios del marco activo."));
children.push(bullet("Normalización a escala común (1-5: Muy bajo → Muy alto) como regla transparente y configurable antes de graficar."));
children.push(bullet("Los gráficos se incrustan dentro de las secciones y en anexos; el profesional puede incluirlos o excluirlos."));

// 12. Seguridad
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("12. Seguridad y protección de datos"));
children.push(P("El sistema maneja datos de salud mental confidenciales en servidor propio del centro. Nivel de protección máximo razonable:"));
children.push(table([2800, 6560], [
  ["Capa", "Medidas"],
  ["Autenticación", "Auth.js, contraseñas bcrypt (factor 12+), 2FA obligatorio para admins, expiración de sesión, bloqueo por intentos fallidos"],
  ["Autorización", "RBAC por endpoint, permisos a nivel de recurso, AccessGrant para informes ajenos"],
  ["Datos en tránsito", "HTTPS/TLS 1.3, HSTS, sin datos sensibles en query params"],
  ["Datos en reposo", "Encriptación de campos sensibles (RUT, diagnósticos, medicación, hospitalizaciones, hipótesis), archivos encriptados"],
  ["Auditoría", "Log inmutable (append-only) de accesos, cambios, solicitudes y exportaciones"],
  ["Infraestructura", "Docker con red privada, secretos en variables de entorno, rate limiting, CORS estricto, CSP"],
  ["Archivos", "PDF en directorio no público, URLs firmadas temporales, hash SHA-256, validación MIME de subidas"],
]));
children.push(spacer());
children.push(H2("12.1 Continuidad y respaldos"));
children.push(bullet("Backups automáticos diarios encriptados."));
children.push(bullet("Backup fuera del servidor (NAS o nube cifrada): un servidor propio sin respaldo externo es un punto único de falla crítico para datos clínicos."));
children.push(bullet("Pruebas periódicas de restauración de backups."));
children.push(bullet("Soft delete: los informes nunca se eliminan físicamente; retención según legislación chilena (mínimo 5 años para registros de salud)."));

// 13. Riesgos
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("13. Riesgos identificados"));
children.push(H2("13.1 Riesgos clínicos"));
children.push(table([1400, 4480, 3480], [
  ["ID", "Riesgo", "Mitigación"],
  ["RC-01", "Aceptar borrador IA sin revisión", "Revisión y confirmación obligatoria por sección"],
  ["RC-02", "Biblioteca de interpretaciones incorrecta", "Versionado + auditoría de diccionarios"],
  ["RC-03", "Recomendaciones por reglas mal configuradas", "Vista previa de reglas activas antes de generar"],
  ["RC-04", "Exportar sin revisión completa", "Indicador de completitud + firma antes de exportar"],
  ["RC-05", "Error en transcripción de puntajes", "Validación lado a lado del PDF original"],
]));
children.push(spacer());
children.push(H2("13.2 Riesgos técnicos"));
children.push(table([1400, 4480, 3480], [
  ["ID", "Riesgo", "Mitigación"],
  ["RT-01", "IA genera texto inapropiado", "Prompt restringido + revisión obligatoria"],
  ["RT-02", "Diccionarios inconsistentes", "Versionado, sin edición directa en producción"],
  ["RT-03", "Informe en estado inconsistente", "Máquina de estados explícita"],
  ["RT-04", "Pérdida de datos confidenciales", "Encriptación + backups externos + auditoría"],
  ["RT-05", "Edición concurrente del mismo informe", "Locking optimista / sesiones de edición"],
  ["RT-06", "Extracción de PDF poco fiable", "Validación humana obligatoria, fases incrementales"],
]));

// 14. Escala y despliegue
children.push(H1("14. Escala y despliegue"));
children.push(bullet("~6 profesionales, ~7 pacientes/mes, procesos de ~5 semanas. Escala pequeña y predecible."));
children.push(bullet("Foco en robustez, seguridad y UX, no en escalado masivo."));
children.push(bullet("Despliegue: Docker Compose (web, api, postgres, nginx) en servidor propio con TLS Let's Encrypt, firewall (solo 80/443), PostgreSQL no expuesto."));

// 15. Estructura de carpetas
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("15. Estructura del proyecto"));
children.push(P("Monorepo:", { bold: true }));
[
  "apps/web — Next.js (App Router): (auth), (dashboard)/repository, patients, reports/[id]/{interview,evaluation,observation,editor,recommendations,finalize}, admin/{users,access-requests,dictionaries,recommendations,templates,audit-log}",
  "apps/api — NestJS: modules/{auth,users,patients,reports,repository,access-control,interview,evaluation,observation,dictionary,recommendations,ai,import,charts,export,finalize,audit,notifications}",
  "packages/shared-types, packages/clinical-constants",
  "prisma/schema.prisma + seed/{frameworks,snp-chc-domains,tests-catalog,dictionaries,recommendations}",
  "storage/ (no público): final-reports, imported-pdfs, temp-exports",
  "docker/ docker-compose.yml + Nginx + Dockerfiles",
  "docs/ (este documento y especificaciones)",
].forEach((t) => children.push(bullet(t)));

// 16. Roadmap
children.push(H1("16. Hoja de ruta del MVP"));
children.push(num("Monorepo + Prisma schema + autenticación y roles."));
children.push(num("CRUD de pacientes y máquina de estados del informe."));
children.push(num("Formularios: antecedentes, conducta, conclusiones."));
children.push(num("Motor de reglas + diccionarios clínicos (seed inicial)."));
children.push(num("Ingreso de puntajes + PDF adjunto + tablas de anexos."));
children.push(num("Generación de borrador asistido por IA (antecedentes y conducta)."));
children.push(num("Editor por sección + aprobación + gráficos de perfil."));
children.push(num("Exportación Word/PDF + etapa de informe final."));
children.push(num("Repositorio + control de acceso + auditoría."));
children.push(num("Endurecimiento de seguridad + backups + despliegue."));

// ---------- document ----------
const doc = new Document({
  creator: "Mirai",
  title: "Mirai — Documento de Análisis y Diseño",
  styles: {
    default: { document: { run: { font: "Calibri", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, color: NAVY, font: "Calibri" },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 0,
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 4 } } } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, color: BLUE, font: "Calibri" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 23, bold: true, color: "595959", font: "Calibri" },
        paragraph: { spacing: { before: 140, after: 80 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 540, hanging: 260 } } } },
        { level: 1, format: LevelFormat.BULLET, text: "◦", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1080, hanging: 260 } } } },
      ] },
      { reference: "numbers", levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 540, hanging: 260 } } } },
      ] },
    ],
  },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF", space: 4 } },
      children: [new TextRun({ text: "Mirai — Análisis y Diseño", color: "808080", size: 18 })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "Centro Neuropsia  ·  Confidencial  ·  Página ", color: "808080", size: 18 }),
        new TextRun({ children: [PageNumber.CURRENT], color: "808080", size: 18 })] })] }) },
    children,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(path.join(__dirname, "Mirai - Documento de Diseno.docx"), buf);
  console.log("OK: Mirai - Documento de Diseno.docx");
});
