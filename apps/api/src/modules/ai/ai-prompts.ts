// System prompts for AI-generated sections (cached via Anthropic prompt caching)

export const BACKGROUND_SYSTEM_PROMPT = `Eres un asistente de redacción clínica especializado en neuropsicología. \
Tu única función es redactar el apartado "Antecedentes Relevantes" de un informe neuropsicológico en español clínico formal, \
basándote exclusivamente en los datos estructurados que se te proporcionen.

REGLAS ESTRICTAS (debes cumplirlas sin excepción):
- Usa únicamente la información proporcionada. No inventes, asumas ni extrapolés datos ausentes.
- Escribe en tercera persona (el paciente / la paciente / el/la evaluado/a).
- Usa lenguaje clínico formal en español. Evita coloquialismos.
- NO interpretes resultados cognitivos ni neuropsicológicos.
- NO generes diagnósticos, hipótesis diagnósticas ni conclusiones clínicas.
- NO uses frases como "podría indicar", "sugiere", "es probable que".
- Si un campo está vacío o no fue reportado, simplemente omite esa información del texto.
- Genera párrafos coherentes y fluidos. No uses listas ni viñetas.
- Organiza la información siguiendo el orden clásico del informe: motivo de consulta → contexto familiar → \
  desarrollo evolutivo → conducta y sintomatología → situación actual → contexto social/educativo/laboral → antecedentes médicos.
- Extensión: entre 300 y 600 palabras.
- USO DE "NO": usa la palabra "no" un máximo de 2 veces en todo el texto. \
  Para la información ausente o descartada, usa estas fórmulas en su lugar: \
  · "se descartaron antecedentes de X" (para historia, diagnósticos previos, antecedentes familiares), \
  · "actualmente se encuentra sin X" o "sin reporte de X en la actualidad" (para situación actual, tratamientos), \
  · "el desarrollo de X se reportó dentro de parámetros esperados" (para hitos del desarrollo), \
  · "la familia no reporta..." → reemplazar por "la familia descarta..." o "sin reporte de...". \
  Nunca uses frases como "no presenta", "no tiene", "no hay", "no se reportaron", "no refiere": \
  sustitúyelas siempre por las fórmulas anteriores.`;

// Prompt para generación directa desde PDF de entrevista (sin formulario estructurado)
export const BACKGROUND_FROM_PDF_PROMPT = `Eres un asistente de redacción clínica especializado en neuropsicología. \
Tu única función es redactar el apartado "Antecedentes Relevantes" de un informe neuropsicológico en español clínico formal, \
a partir del texto de una entrevista o ficha de anamnesis que se te proporcionará.

REGLAS ESTRICTAS (debes cumplirlas sin excepción):
- Usa únicamente la información presente en el documento. No inventes, asumas ni extrapolés datos ausentes.
- Escribe en tercera persona (el paciente / la paciente / el/la evaluado/a).
- Usa lenguaje clínico formal en español. Evita coloquialismos y lenguaje coloquial.
- NO interpretes resultados cognitivos ni neuropsicológicos.
- NO generes diagnósticos, hipótesis diagnósticas ni conclusiones clínicas.
- NO uses frases como "podría indicar", "sugiere", "es probable que".
- Omite la información que no esté en el documento; no menciones los campos que estaban vacíos.
- Genera párrafos coherentes y fluidos. No uses listas ni viñetas.
- Organiza la información siguiendo el orden clásico del informe: contexto familiar → \
  desarrollo evolutivo → conducta y sintomatología → situación actual → contexto social/educativo/laboral → antecedentes médicos.
- Extensión: entre 300 y 600 palabras.
- USO DE "NO": usa la palabra "no" un máximo de 2 veces en todo el texto. \
  Para la información ausente o descartada, usa estas fórmulas en su lugar: \
  · "se descartaron antecedentes de X" (historia, diagnósticos previos, antecedentes familiares), \
  · "actualmente se encuentra sin X" / "sin reporte de X en la actualidad" (situación actual, tratamientos), \
  · "el desarrollo de X se reportó dentro de parámetros esperados" (hitos del desarrollo). \
  Nunca uses "no presenta", "no tiene", "no hay", "no se reportaron", "no refiere".`;

export const OBSERVATION_SYSTEM_PROMPT = `Eres un asistente de redacción clínica especializado en neuropsicología. \
Tu única función es redactar el apartado "Conducta Observada durante la Evaluación" de un informe neuropsicológico \
en español clínico formal, basándote exclusivamente en los datos del checklist de observación que se te proporcionen.

REGLAS ESTRICTAS:
- Usa únicamente la información del checklist. No añadas observaciones que no figuren en los datos.
- Escribe en tercera persona (el paciente / la paciente / el/la evaluado/a).
- Usa lenguaje clínico formal en español.
- NO hagas interpretaciones diagnósticas ni inferences más allá de lo observado.
- Las puntuaciones del checklist significan: 0 = sin dificultad / adecuado para la tarea, \
  1 = leve / presente ocasionalmente, 2 = significativo / persistente durante la evaluación.
- Solo menciona en el texto los aspectos con puntuación > 0, y los que tengan puntuación 0 \
  solo si son relevantes como fortalezas (cooperación, motivación).
- Genera párrafos coherentes y fluidos. No uses listas ni viñetas.
- Extensión: entre 150 y 400 palabras.`;

// Decodes a field that may be stored as JSON {selected, notes} or plain string
function decodeField(raw: string): string {
  if (!raw) return '';
  try {
    const p = JSON.parse(raw);
    if (Array.isArray(p?.selected)) {
      const parts = (p.selected as string[]).join(', ');
      const notes = (p.notes as string | undefined)?.trim() ?? '';
      return [parts, notes].filter(Boolean).join('. ');
    }
    if (typeof p?.value === 'string') {
      const notes = (p.notes as string | undefined)?.trim() ?? '';
      return [p.value, notes].filter(Boolean).join('. ');
    }
  } catch {}
  return raw;
}

// Converts interview form data to a human-readable prompt payload
export function formatInterviewForPrompt(data: Record<string, unknown>, patientName: string): string {
  const get = (section: string, field: string): string => {
    const sec = data[section] as Record<string, string> | undefined;
    return decodeField(sec?.[field]?.trim() || '');
  };

  const lines: string[] = [`DATOS DEL PACIENTE: ${patientName}`, ''];

  // Section 1: Motivo de consulta
  const whoConsults = get('section1', 'whoConsults');
  const whyConsults = get('section1', 'whyConsults');
  const purpose = get('section1', 'purposeOfEvaluation');
  if (whoConsults || whyConsults || purpose) {
    lines.push('## MOTIVO DE CONSULTA');
    if (whoConsults) lines.push(`Quién consulta: ${whoConsults}`);
    if (whyConsults) lines.push(`Motivo: ${whyConsults}`);
    if (purpose) lines.push(`Propósito de la evaluación: ${purpose}`);
    lines.push('');
  }

  // Section 2: Contexto familiar
  const householdMembers = get('section2', 'householdMembers');
  const relationType = get('section2', 'householdRelationType');
  const caregivers = get('section2', 'primaryCaregivers');
  const psychosocial = get('section2', 'psychosocialContext');
  if (householdMembers || relationType || caregivers || psychosocial) {
    lines.push('## CONTEXTO FAMILIAR');
    if (householdMembers) lines.push(`Composición del hogar: ${householdMembers}`);
    if (relationType) lines.push(`Tipo de relación parental: ${relationType}`);
    if (caregivers) lines.push(`Cuidadores principales: ${caregivers}`);
    if (psychosocial) lines.push(`Contexto psicosocial: ${psychosocial}`);
    lines.push('');
  }

  // Section 3: Historia del desarrollo
  const pregnancy = get('section3', 'pregnancyAndBirth');
  const milestones = get('section3', 'psychomotorMilestones');
  const language = get('section3', 'languageDevelopment');
  const sphincter = get('section3', 'sphincterControl');
  if (pregnancy || milestones || language || sphincter) {
    lines.push('## HISTORIA DEL DESARROLLO');
    if (pregnancy) lines.push(`Embarazo y nacimiento: ${pregnancy}`);
    if (milestones) lines.push(`Hitos psicomotores: ${milestones}`);
    if (language) lines.push(`Desarrollo del lenguaje: ${language}`);
    if (sphincter) lines.push(`Control de esfínteres: ${sphincter}`);
    lines.push('');
  }

  // Section 4: Conducta en la infancia
  const behavior = get('section4', 'childhoodBehavior');
  const symptoms = get('section4', 'childhoodSymptoms');
  const emotReg = get('section4', 'emotionalRegulationChildhood');
  const authority = get('section4', 'relationshipWithAuthority');
  if (behavior || symptoms || emotReg || authority) {
    lines.push('## CONDUCTA Y SINTOMATOLOGÍA EN LA INFANCIA');
    if (behavior) lines.push(`Conducta: ${behavior}`);
    if (symptoms) lines.push(`Sintomatología: ${symptoms}`);
    if (emotReg) lines.push(`Regulación emocional: ${emotReg}`);
    if (authority) lines.push(`Relación con la autoridad: ${authority}`);
    lines.push('');
  }

  // Section 5: Situación actual
  const current = get('section5', 'currentSymptomsDescription');
  const impact = get('section5', 'dailyFunctioningImpact');
  const treatments = get('section5', 'currentTreatments');
  if (current || impact || treatments) {
    lines.push('## SITUACIÓN ACTUAL');
    if (current) lines.push(`Síntomas actuales: ${current}`);
    if (impact) lines.push(`Impacto en funcionamiento: ${impact}`);
    if (treatments) lines.push(`Tratamientos actuales: ${treatments}`);
    lines.push('');
  }

  // Section 6: Contexto social
  const friends = get('section6', 'currentFriendships');
  const networks = get('section6', 'currentSocialNetworks');
  const hobbies = get('section6', 'hobbiesAndInterests');
  if (friends || networks || hobbies) {
    lines.push('## CONTEXTO SOCIAL E INTERESES');
    if (friends) lines.push(`Amistades: ${friends}`);
    if (networks) lines.push(`Redes sociales: ${networks}`);
    if (hobbies) lines.push(`Hobbies e intereses: ${hobbies}`);
    lines.push('');
  }

  // Section 7: Escolar / laboral
  const education = get('section7', 'educationLevel');
  const support = get('section7', 'receivedSupport');
  const work = get('section7', 'workSituation');
  if (education || support || work) {
    lines.push('## HISTORIA ESCOLAR / LABORAL');
    if (education) lines.push(`Nivel educacional: ${education}`);
    if (support) lines.push(`Apoyos recibidos: ${support}`);
    if (work) lines.push(`Situación laboral: ${work}`);
    lines.push('');
  }

  // Section 8: Antecedentes médicos
  const diagnoses = get('section8', 'previousDiagnoses');
  const medication = get('section8', 'currentMedication');
  const hospitalizations = get('section8', 'hospitalizationsTraumas');
  const prevEvals = get('section8', 'previousEvaluations');
  const family = get('section8', 'familyMedicalHistory');
  if (diagnoses || medication || hospitalizations || prevEvals || family) {
    lines.push('## ANTECEDENTES MÉDICOS');
    if (diagnoses) lines.push(`Diagnósticos previos: ${diagnoses}`);
    if (medication) lines.push(`Medicación actual: ${medication}`);
    if (hospitalizations) lines.push(`Hospitalizaciones/traumas: ${hospitalizations}`);
    if (prevEvals) lines.push(`Evaluaciones previas: ${prevEvals}`);
    if (family) lines.push(`Historia médica familiar: ${family}`);
    lines.push('');
  }

  return lines.join('\n');
}

// ── Extracción de ficha PDF ────────────────────────────────────────────────────

export const PDF_INTERVIEW_EXTRACTION_SYSTEM_PROMPT = `Eres un asistente clínico especializado en neuropsicología. \
Tu tarea es leer el texto extraído de una ficha de anamnesis clínica y organizar la información en un JSON estructurado.

REGLAS:
- Extrae SOLO información explícitamente presente en el texto. No inventes datos.
- Si no hay información para un campo, omítelo del JSON (no lo incluyas con valor vacío).
- El JSON debe ser válido y sin comentarios.
- Responde ÚNICAMENTE con el JSON, sin texto adicional, sin markdown, sin triple backtick.

El JSON debe tener esta estructura (incluye solo los campos que encontraste):
{
  "section2": {
    "householdMembers": "composición del hogar (quiénes viven con el paciente)",
    "householdRelationType": "biparental | monoparental | reconstituida | otro",
    "primaryCaregivers": "cuidadores principales",
    "psychosocialContext": "contexto psicosocial, factores de riesgo o protección"
  },
  "section3": {
    "pregnancyAndBirth": "embarazo, parto, complicaciones perinatales",
    "psychomotorMilestones": "hitos del desarrollo motor (gateo, marcha, etc.)",
    "languageDevelopment": "desarrollo del lenguaje (primeras palabras, frases)",
    "sphincterControl": "control de esfínteres"
  },
  "section4": {
    "childhoodBehavior": "conducta en la infancia",
    "childhoodSymptoms": "sintomatología en la infancia",
    "emotionalRegulationChildhood": "regulación emocional en la infancia",
    "relationshipWithAuthority": "relación con la autoridad (padres, docentes)"
  },
  "section5": {
    "currentSymptomsDescription": "descripción de los síntomas actuales",
    "dailyFunctioningImpact": "impacto en el funcionamiento diario",
    "currentTreatments": "tratamientos o intervenciones actuales"
  },
  "section6": {
    "currentFriendships": "vínculos de amistad actuales",
    "currentSocialNetworks": "redes de apoyo social",
    "hobbiesAndInterests": "intereses, hobbies, actividades recreativas"
  },
  "section7": {
    "educationLevel": "nivel educacional, escolaridad actual o pasada",
    "receivedSupport": "apoyos recibidos (PIE, psicopedagogía, fonoaudiología, etc.)",
    "workSituation": "situación laboral (adultos)"
  },
  "section8": {
    "previousDiagnoses": "diagnósticos previos",
    "currentMedication": "medicación actual (nombre y dosis)",
    "hospitalizationsTraumas": "hospitalizaciones, cirugías, traumatismos",
    "previousEvaluations": "evaluaciones psicológicas o neuropsicológicas previas",
    "familyMedicalHistory": "antecedentes médicos familiares relevantes"
  }
}`;

export function buildPdfExtractionPrompt(pdfText: string): string {
  return `A continuación está el texto extraído de una ficha de anamnesis clínica. Extrae la información y devuelve el JSON.\n\n---\n${pdfText.slice(0, 8000)}\n---`;
}

// ─────────────────────────────────────────────────────────────────────────────

const SCORE_LABELS: Record<number, string> = { 0: 'adecuado/sin dificultad', 1: 'levemente alterado', 2: 'significativamente alterado' };
const NIVEL_ACTIVIDAD: Record<string, string> = { hipo: 'hipoactivo', normo: 'normoactivo', hiper: 'hiperactivo' };
const EXPRESION_VERBAL: Record<string, string> = { fluida: 'fluida', reducida: 'reducida', excesiva: 'excesiva/verborreica' };

export function formatObservationForPrompt(data: Record<string, unknown>, patientName: string): string {
  const score = (key: string) => {
    const v = data[key];
    return typeof v === 'number' ? v : null;
  };

  const lines: string[] = [`DATOS DEL PACIENTE: ${patientName}`, '', '## CHECKLIST DE CONDUCTA OBSERVADA', ''];

  const ITEMS: Array<[string, string]> = [
    ['cooperacion', 'Cooperación durante la evaluación'],
    ['motivacion', 'Motivación/esfuerzo'],
    ['ansiedad', 'Ansiedad observable'],
    ['toleranciaFrustracion', 'Tolerancia a la frustración'],
    ['atencionSostenida', 'Atención sostenida'],
    ['impulsividad', 'Impulsividad'],
    ['fatiga', 'Fatiga/cansancio'],
    ['comprensionInstrucciones', 'Comprensión de instrucciones'],
    ['calidadLenguaje', 'Calidad del lenguaje expresivo'],
    ['contactoVisual', 'Contacto visual'],
    ['reciprocidadSocial', 'Reciprocidad social'],
    ['relacionEvaluador', 'Relación con el evaluador'],
    ['coordinacionMotora', 'Coordinación motora'],
    ['conductasEstereotipadas', 'Conductas estereotipadas/repetitivas'],
    ['rigidezConductual', 'Rigidez conductual'],
  ];

  for (const [key, label] of ITEMS) {
    const v = score(key);
    if (v !== null) lines.push(`${label}: ${v} (${SCORE_LABELS[v] ?? v})`);
  }

  const nivelActividad = data['nivelActividad'] as string | undefined;
  if (nivelActividad) lines.push(`Nivel de actividad motora: ${NIVEL_ACTIVIDAD[nivelActividad] ?? nivelActividad}`);

  const expresionVerbal = data['expresionVerbal'] as string | undefined;
  if (expresionVerbal) lines.push(`Expresión verbal: ${EXPRESION_VERBAL[expresionVerbal] ?? expresionVerbal}`);

  const additional = (data['additionalObservations'] as string | undefined)?.trim();
  if (additional) {
    lines.push('');
    lines.push(`## OBSERVACIONES ADICIONALES`);
    lines.push(additional);
  }

  return lines.join('\n');
}
