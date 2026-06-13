import { generateProcedureText, ProcedureSourceData, CognitiveTestInfo } from '../procedure-text';

const cogTests: CognitiveTestInfo[] = [
  { code: 'WISC-V', name: 'Escala de Inteligencia de Wechsler para Niños, quinta edición (WISC-V)', type: 'intelligence', orderIndex: 1 },
  { code: 'TFCRO', name: 'Test de la Figura Compleja de Rey-Osterrieth (TFCRO)', type: 'cognitive', orderIndex: 3 },
];

const questTests: CognitiveTestInfo[] = [
  { code: 'BASC-3', name: 'Sistema de Evaluación de la Conducta de Niños y Adolescentes, tercera edición (BASC-3)', type: 'questionnaire', orderIndex: 11 },
];

const base: ProcedureSourceData = {
  interviewWith: 'PARENTS',
  interviewModality: 'PRESENCIAL',
  adirModality: 'PRESENCIAL',
  questionnairesShared: false,
  questionnaireRespondent: null,
  questionnaireRespondentCustom: null,
};

describe('generateProcedureText', () => {
  describe('Procedimiento — entrevista', () => {
    it('includes interview sentence for PARENTS presencial', () => {
      const text = generateProcedureText(base, 'Agustina Pérez', cogTests);
      expect(text).toContain('Se realizó entrevista con los padres de Agustina');
    });

    it('adds "telefónica" for PARENTS telepresencial', () => {
      const text = generateProcedureText({ ...base, interviewModality: 'TELEPRESENCIAL' }, 'Agustina Pérez', cogTests);
      expect(text).toContain('Se realizó entrevista telefónica con los padres de Agustina');
    });

    it('uses first name for PATIENT interviewWith', () => {
      const text = generateProcedureText({ ...base, interviewWith: 'PATIENT' }, 'Agustina Pérez', cogTests);
      expect(text).toContain('Se realizó entrevista con Agustina');
      expect(text).not.toContain('padres');
    });

    it('includes both for BOTH interviewWith', () => {
      const text = generateProcedureText({ ...base, interviewWith: 'BOTH' }, 'Agustina Pérez', cogTests);
      expect(text).toContain('Se realizó entrevista con Agustina y sus padres');
    });

    it('omits interview sentence when NONE', () => {
      const text = generateProcedureText({ ...base, interviewWith: 'NONE' }, 'Agustina Pérez', cogTests);
      expect(text).not.toContain('Se realizó entrevista');
    });
  });

  describe('Procedimiento — cuerpo y cuestionarios', () => {
    it('always includes evaluation body', () => {
      const text = generateProcedureText(base, 'Agustina Pérez', cogTests);
      expect(text).toContain('evaluación completa en Neuropsia');
      expect(text).toContain('Cada una de estas sesiones');
    });

    it('omits questionnaire paragraph when questionnairesShared is false', () => {
      const text = generateProcedureText(base, 'Agustina Pérez', cogTests);
      expect(text).not.toContain('se envió un set de cuestionarios');
    });

    it('adds questionnaire paragraph with "para la familia" for FAMILY', () => {
      const data = { ...base, questionnairesShared: true, questionnaireRespondent: 'FAMILY' as const };
      const text = generateProcedureText(data, 'Agustina Pérez', [...cogTests, ...questTests]);
      expect(text).toContain('cuestionarios para la familia');
      expect(text).toContain('devolvieron al/a la evaluador/a');
    });

    it('uses first name for PATIENT respondent', () => {
      const data = { ...base, questionnairesShared: true, questionnaireRespondent: 'PATIENT' as const };
      const text = generateProcedureText(data, 'Agustina Pérez', [...cogTests, ...questTests]);
      expect(text).toContain('cuestionarios para Agustina');
    });

    it('uses teacher phrase for TEACHER respondent', () => {
      const data = { ...base, questionnairesShared: true, questionnaireRespondent: 'TEACHER' as const };
      const text = generateProcedureText(data, 'Agustina Pérez', [...cogTests, ...questTests]);
      expect(text).toContain('para los docentes de Agustina');
    });

    it('uses custom text for OTHER respondent', () => {
      const data = { ...base, questionnairesShared: true, questionnaireRespondent: 'OTHER' as const, questionnaireRespondentCustom: 'para la abuela' };
      const text = generateProcedureText(data, 'Agustina Pérez', [...cogTests, ...questTests]);
      expect(text).toContain('cuestionarios para la abuela');
    });
  });

  describe('Pruebas aplicadas', () => {
    it('contains section header "Pruebas aplicadas"', () => {
      const text = generateProcedureText(base, 'Agustina Pérez', cogTests);
      expect(text).toContain('Pruebas aplicadas');
    });

    it('starts test list with "Entrevista clínica"', () => {
      const text = generateProcedureText(base, 'Agustina Pérez', cogTests);
      expect(text).toContain('Fueron aplicadas: Entrevista clínica.');
    });

    it('lists cognitive tests in orderIndex order', () => {
      const text = generateProcedureText(base, 'Agustina Pérez', cogTests);
      expect(text).toContain('Escala de Inteligencia de Wechsler para Niños, quinta edición (WISC-V)');
      expect(text).toContain('Test de la Figura Compleja de Rey-Osterrieth (TFCRO)');
      expect(text.indexOf('WISC-V')).toBeLessThan(text.indexOf('TFCRO'));
    });

    it('adds questionnaire paragraph when questionnaire tests are present', () => {
      const text = generateProcedureText(base, 'Agustina Pérez', [...cogTests, ...questTests]);
      expect(text).toContain('cuestionarios de valoración subjetiva');
      expect(text).toContain('Sistema de Evaluación de la Conducta de Niños y Adolescentes');
    });

    it('omits questionnaire paragraph in pruebas when no questionnaire tests', () => {
      const text = generateProcedureText(base, 'Agustina Pérez', cogTests);
      expect(text).not.toContain('cuestionarios de valoración subjetiva');
    });

    it('uses only first name for "autonomía de" phrase', () => {
      const text = generateProcedureText(base, 'Agustina Pérez', [...cogTests, ...questTests]);
      expect(text).toContain('autonomía de Agustina');
    });
  });
});
