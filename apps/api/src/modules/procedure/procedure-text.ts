export interface CognitiveTestInfo {
  code: string;
  name: string;
  type: string;
  orderIndex: number;
}

export interface ProcedureSourceData {
  interviewWith: 'PARENTS' | 'PATIENT' | 'BOTH' | 'NONE';
  interviewModality: 'PRESENCIAL' | 'TELEPRESENCIAL';
  adirModality: 'PRESENCIAL' | 'TELEPRESENCIAL'; // stored for UI, not used in text generation
  questionnairesShared: boolean;
  questionnaireRespondent: 'FAMILY' | 'PATIENT' | 'TEACHER' | 'OTHER' | null;
  questionnaireRespondentCustom: string | null;
}

export function generateProcedureText(
  data: ProcedureSourceData,
  patientName: string,
  tests: CognitiveTestInfo[],
): string {
  const firstName = patientName.split(' ')[0];
  const lines: string[] = [];

  lines.push('Procedimiento');

  if (data.interviewWith !== 'NONE') {
    const prefix = data.interviewModality === 'TELEPRESENCIAL' ? 'telefónica ' : '';
    const subject =
      data.interviewWith === 'PARENTS' ? `los padres de ${firstName}` :
      data.interviewWith === 'PATIENT' ? firstName :
      `${firstName} y sus padres`;
    lines.push(
      `Se realizó entrevista ${prefix}con ${subject}, con el objetivo de indagar en antecedentes relevantes para la evaluación.`,
    );
  }

  lines.push(
    'Posteriormente, se realizó una evaluación completa en Neuropsia. Cada una de estas sesiones se enfocó en evaluar las diferentes dimensiones cognitivas a través de diversas pruebas.',
  );

  if (data.questionnairesShared && data.questionnaireRespondent) {
    const dest =
      data.questionnaireRespondent === 'FAMILY' ? 'para la familia' :
      data.questionnaireRespondent === 'PATIENT' ? `para ${firstName}` :
      data.questionnaireRespondent === 'TEACHER' ? `para los docentes de ${firstName}` :
      (data.questionnaireRespondentCustom ?? 'para el informante');
    lines.push(
      `Además, se envió un set de cuestionarios ${dest}, que buscaban obtener información sobre la conducta de ${firstName} en diversos contextos. Estos cuestionarios fueron respondidos fuera de las sesiones de evaluación y se devolvieron al/a la evaluador/a.`,
    );
  }

  lines.push('');
  lines.push('Pruebas aplicadas');
  lines.push(
    'Esta evaluación incluyó pruebas neuropsicológicas de dominio general y específico. Se privilegió el uso de pruebas actualizadas con baremos poblacionales apropiados para población chilena.',
  );

  const cogTests = tests
    .filter(t => t.type !== 'questionnaire')
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const qTests = tests
    .filter(t => t.type === 'questionnaire')
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const testList = ['Entrevista clínica', ...cogTests.map(t => t.name)];
  lines.push(`Fueron aplicadas: ${testList.join('. ')}.`);

  if (qTests.length > 0) {
    lines.push(
      `Además de lo anterior, se aplicaron cuestionarios de valoración subjetiva, con el objetivo de evaluar la presencia de sintomatología emocional, conductual y la autonomía de ${firstName}, entre las que se encuentran: ${qTests.map(t => t.name).join('. ')}.`,
    );
  }

  return lines.join('\n');
}
