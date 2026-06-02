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
- Extensión: entre 300 y 600 palabras.`;

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

// Converts interview form data to a human-readable prompt payload
export function formatInterviewForPrompt(data: Record<string, unknown>, patientName: string): string {
  const get = (section: string, field: string): string => {
    const sec = data[section] as Record<string, string> | undefined;
    return sec?.[field]?.trim() || '';
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
