import { PrismaClient } from '@prisma/client';

const TESTS_CATALOG = [
  { code: 'WISC-V', name: 'Escala de Inteligencia de Wechsler para Niños, quinta edición (WISC-V)', abbreviation: 'WISC-V', type: 'intelligence', applicableFrameworks: ['SNP_CHC', 'STANDARD'], requiresInformant: false, orderIndex: 1 },
  { code: 'WAIS-IV', name: 'Escala de Inteligencia de Wechsler para Adultos, cuarta edición (WAIS-IV)', abbreviation: 'WAIS-IV', type: 'intelligence', applicableFrameworks: ['SNP_CHC', 'STANDARD'], requiresInformant: false, orderIndex: 2 },
  { code: 'TFCRO', name: 'Test de la Figura Compleja de Rey-Osterrieth (TFCRO)', abbreviation: 'TFCRO', type: 'cognitive', applicableFrameworks: ['SNP_CHC', 'STANDARD'], requiresInformant: false, orderIndex: 3 },
  { code: 'TAVEC', name: 'Test de Aprendizaje Verbal España-Complutense (TAVEC)', abbreviation: 'TAVEC', type: 'cognitive', applicableFrameworks: ['STANDARD'], requiresInformant: false, orderIndex: 4 },
  { code: 'TAVECI', name: 'Test de Aprendizaje Verbal España-Complutense Infantil (TAVECI)', abbreviation: 'TAVECI', type: 'cognitive', applicableFrameworks: ['SNP_CHC'], requiresInformant: false, orderIndex: 5 },
  { code: 'WCST', name: 'Wisconsin Card Sorting Test (WCST)', abbreviation: 'WCST', type: 'cognitive', applicableFrameworks: ['SNP_CHC', 'STANDARD'], requiresInformant: false, orderIndex: 6 },
  { code: 'TMT', name: 'Trail Making Test (TMT)', abbreviation: 'TMT', type: 'cognitive', applicableFrameworks: ['SNP_CHC', 'STANDARD'], requiresInformant: false, orderIndex: 7 },
  { code: 'CARAS-R', name: 'Test de Percepción de Diferencias-Revisado (CARAS-R)', abbreviation: 'CARAS-R', type: 'cognitive', applicableFrameworks: ['SNP_CHC', 'STANDARD'], requiresInformant: false, orderIndex: 8 },
  { code: 'ADOS-2', name: 'Escala de Observación para el Diagnóstico del Autismo, segunda edición (ADOS-2)', abbreviation: 'ADOS-2', type: 'social-cognition', applicableFrameworks: ['SNP_CHC'], requiresInformant: false, orderIndex: 9 },
  { code: 'ADI-R', name: 'Entrevista para el Diagnóstico del Autismo-Revisada (ADI-R)', abbreviation: 'ADI-R', type: 'social-cognition', applicableFrameworks: ['SNP_CHC'], requiresInformant: true, orderIndex: 10 },
  { code: 'BASC-3', name: 'Sistema de Evaluación de la Conducta de Niños y Adolescentes, tercera edición (BASC-3)', abbreviation: 'BASC-3', type: 'questionnaire', applicableFrameworks: ['SNP_CHC'], requiresInformant: true, orderIndex: 11 },
  { code: 'ASRS-18', name: 'Escala de Autoevaluación del TDAH en Adultos (ASRS-18)', abbreviation: 'ASRS-18', type: 'questionnaire', applicableFrameworks: ['STANDARD'], requiresInformant: false, orderIndex: 12 },
  { code: 'DEX-SP', name: 'Cuestionario Disejecutivo (DEX-Sp)', abbreviation: 'DEX-Sp', type: 'questionnaire', applicableFrameworks: ['STANDARD'], requiresInformant: false, orderIndex: 13 },
  { code: 'BAI', name: 'Inventario de Ansiedad de Beck (BAI)', abbreviation: 'BAI', type: 'questionnaire', applicableFrameworks: ['STANDARD'], requiresInformant: false, orderIndex: 14 },
  { code: 'BDI-II', name: 'Inventario de Depresión de Beck, segunda edición (BDI-II)', abbreviation: 'BDI-II', type: 'questionnaire', applicableFrameworks: ['STANDARD'], requiresInformant: false, orderIndex: 15 },
];

export async function seedTestsCatalog(prisma: PrismaClient) {
  for (const test of TESTS_CATALOG) {
    await prisma.cognitiveTest.upsert({
      where: { code: test.code },
      update: {
        name: test.name,
        applicableFrameworks: test.applicableFrameworks,
        requiresInformant: test.requiresInformant,
      },
      create: {
        code: test.code,
        name: test.name,
        abbreviation: test.abbreviation,
        type: test.type,
        applicableFrameworks: test.applicableFrameworks,
        requiresInformant: test.requiresInformant,
        orderIndex: test.orderIndex,
      },
    });
  }
  console.log('✓ Tests catalog seeded (15 instruments)');
}
