import { PrismaClient } from '@prisma/client';

type SlotDef = {
  testCode: string;
  key: string;
  name: string;
  scoreType: string;
  descriptorScaleCode: string;
  requiresConversion?: boolean;
  isInverse?: boolean;
  cutoffBorderline?: number;
  cutoffClinicallySignificant?: number;
  orderIndex: number;
};

const SLOTS: SlotDef[] = [
  // ── WISC-V — Índices compuestos (SS, escala WISC_SS)
  { testCode: 'WISC-V', key: 'ICV', name: 'Índice de Comprensión Verbal', scoreType: 'SS', descriptorScaleCode: 'WISC_SS', orderIndex: 1 },
  { testCode: 'WISC-V', key: 'IVE', name: 'Índice Visuoespacial', scoreType: 'SS', descriptorScaleCode: 'WISC_SS', orderIndex: 2 },
  { testCode: 'WISC-V', key: 'IRP', name: 'Índice de Razonamiento Fluido', scoreType: 'SS', descriptorScaleCode: 'WISC_SS', orderIndex: 3 },
  { testCode: 'WISC-V', key: 'MRT', name: 'Índice de Memoria de Trabajo', scoreType: 'SS', descriptorScaleCode: 'WISC_SS', orderIndex: 4 },
  { testCode: 'WISC-V', key: 'IVP', name: 'Índice de Velocidad de Procesamiento', scoreType: 'SS', descriptorScaleCode: 'WISC_SS', orderIndex: 5 },
  // WISC-V subtests (escalares, escala WISC_SCALED)
  { testCode: 'WISC-V', key: 'SEMEJANZAS', name: 'Semejanzas', scoreType: 'SCALED', descriptorScaleCode: 'WISC_SCALED', orderIndex: 6 },
  { testCode: 'WISC-V', key: 'VOCABULARIO', name: 'Vocabulario', scoreType: 'SCALED', descriptorScaleCode: 'WISC_SCALED', orderIndex: 7 },
  { testCode: 'WISC-V', key: 'CUBOS', name: 'Cubos', scoreType: 'SCALED', descriptorScaleCode: 'WISC_SCALED', orderIndex: 8 },
  { testCode: 'WISC-V', key: 'VISUALES', name: 'Puzles Visuales', scoreType: 'SCALED', descriptorScaleCode: 'WISC_SCALED', orderIndex: 9 },
  { testCode: 'WISC-V', key: 'MATRICES', name: 'Matrices', scoreType: 'SCALED', descriptorScaleCode: 'WISC_SCALED', orderIndex: 10 },
  { testCode: 'WISC-V', key: 'BALANZAS', name: 'Balanzas', scoreType: 'SCALED', descriptorScaleCode: 'WISC_SCALED', orderIndex: 11 },
  { testCode: 'WISC-V', key: 'DIGITOS', name: 'Dígitos', scoreType: 'SCALED', descriptorScaleCode: 'WISC_SCALED', orderIndex: 12 },
  { testCode: 'WISC-V', key: 'ARITMETICA', name: 'Aritmética', scoreType: 'SCALED', descriptorScaleCode: 'WISC_SCALED', orderIndex: 13 },
  { testCode: 'WISC-V', key: 'CLAVES', name: 'Claves', scoreType: 'SCALED', descriptorScaleCode: 'WISC_SCALED', orderIndex: 14 },
  { testCode: 'WISC-V', key: 'BUSQUEDA', name: 'Búsqueda de Símbolos', scoreType: 'SCALED', descriptorScaleCode: 'WISC_SCALED', orderIndex: 15 },

  // ── WAIS-IV — Índices compuestos (SS, escala WAIS_SS)
  { testCode: 'WAIS-IV', key: 'ICV', name: 'Índice de Comprensión Verbal', scoreType: 'SS', descriptorScaleCode: 'WAIS_SS', orderIndex: 1 },
  { testCode: 'WAIS-IV', key: 'IRP', name: 'Índice de Razonamiento Perceptual', scoreType: 'SS', descriptorScaleCode: 'WAIS_SS', orderIndex: 2 },
  { testCode: 'WAIS-IV', key: 'MT', name: 'Índice de Memoria de Trabajo', scoreType: 'SS', descriptorScaleCode: 'WAIS_SS', orderIndex: 3 },
  { testCode: 'WAIS-IV', key: 'VP', name: 'Índice de Velocidad de Procesamiento', scoreType: 'SS', descriptorScaleCode: 'WAIS_SS', orderIndex: 4 },
  // WAIS-IV subtests (escalares, escala WAIS_SCALED)
  { testCode: 'WAIS-IV', key: 'SEMEJANZAS', name: 'Semejanzas', scoreType: 'SCALED', descriptorScaleCode: 'WAIS_SCALED', orderIndex: 5 },
  { testCode: 'WAIS-IV', key: 'VOCABULARIO', name: 'Vocabulario', scoreType: 'SCALED', descriptorScaleCode: 'WAIS_SCALED', orderIndex: 6 },
  { testCode: 'WAIS-IV', key: 'INFORMACION', name: 'Información', scoreType: 'SCALED', descriptorScaleCode: 'WAIS_SCALED', orderIndex: 7 },
  { testCode: 'WAIS-IV', key: 'CUBOS', name: 'Cubos', scoreType: 'SCALED', descriptorScaleCode: 'WAIS_SCALED', orderIndex: 8 },
  { testCode: 'WAIS-IV', key: 'MATRICES', name: 'Matrices', scoreType: 'SCALED', descriptorScaleCode: 'WAIS_SCALED', orderIndex: 9 },
  { testCode: 'WAIS-IV', key: 'VISUALES', name: 'Puzles Visuales', scoreType: 'SCALED', descriptorScaleCode: 'WAIS_SCALED', orderIndex: 10 },
  { testCode: 'WAIS-IV', key: 'DIGITOS', name: 'Dígitos', scoreType: 'SCALED', descriptorScaleCode: 'WAIS_SCALED', orderIndex: 11 },
  { testCode: 'WAIS-IV', key: 'ARITMETICA', name: 'Aritmética', scoreType: 'SCALED', descriptorScaleCode: 'WAIS_SCALED', orderIndex: 12 },
  { testCode: 'WAIS-IV', key: 'CLAVES', name: 'Claves', scoreType: 'SCALED', descriptorScaleCode: 'WAIS_SCALED', orderIndex: 13 },
  { testCode: 'WAIS-IV', key: 'BUSQUEDA', name: 'Búsqueda de Símbolos', scoreType: 'SCALED', descriptorScaleCode: 'WAIS_SCALED', orderIndex: 14 },

  // ── TMT (Trail Making Test) — puntajes en segundos, inversión: más segundos = peor
  { testCode: 'TMT', key: 'TMT_A_SEG', name: 'TMT-A (segundos)', scoreType: 'Z', descriptorScaleCode: 'NEURO_Z', requiresConversion: true, isInverse: true, orderIndex: 1 },
  { testCode: 'TMT', key: 'TMT_B_SEG', name: 'TMT-B (segundos)', scoreType: 'Z', descriptorScaleCode: 'NEURO_Z', requiresConversion: true, isInverse: true, orderIndex: 2 },
  { testCode: 'TMT', key: 'TMT_B_A', name: 'TMT B-A (diferencia)', scoreType: 'Z', descriptorScaleCode: 'NEURO_Z', requiresConversion: true, isInverse: true, orderIndex: 3 },

  // ── WCST (Wisconsin Card Sorting Test)
  { testCode: 'WCST', key: 'WCST_CAT', name: 'Categorías completadas', scoreType: 'Z', descriptorScaleCode: 'NEURO_Z', requiresConversion: true, orderIndex: 1 },
  { testCode: 'WCST', key: 'WCST_EP', name: 'Errores perseverativos', scoreType: 'Z', descriptorScaleCode: 'NEURO_Z', requiresConversion: true, isInverse: true, orderIndex: 2 },
  { testCode: 'WCST', key: 'WCST_ENP', name: 'Errores no perseverativos', scoreType: 'Z', descriptorScaleCode: 'NEURO_Z', requiresConversion: true, isInverse: true, orderIndex: 3 },

  // ── TAVEC (adultos)
  { testCode: 'TAVEC', key: 'TAVEC_A5', name: 'Recuerdo Libre Ensayo 5', scoreType: 'Z', descriptorScaleCode: 'NEURO_Z', requiresConversion: true, orderIndex: 1 },
  { testCode: 'TAVEC', key: 'TAVEC_TOTAL', name: 'Total Aprendizaje (A1–A5)', scoreType: 'Z', descriptorScaleCode: 'NEURO_Z', requiresConversion: true, orderIndex: 2 },
  { testCode: 'TAVEC', key: 'TAVEC_RL_LP', name: 'Recuerdo Libre Largo Plazo', scoreType: 'Z', descriptorScaleCode: 'NEURO_Z', requiresConversion: true, orderIndex: 3 },
  { testCode: 'TAVEC', key: 'TAVEC_RC_LP', name: 'Reconocimiento Largo Plazo', scoreType: 'Z', descriptorScaleCode: 'NEURO_Z', requiresConversion: true, orderIndex: 4 },

  // ── TAVECI (infantil)
  { testCode: 'TAVECI', key: 'TAVECI_A5', name: 'Recuerdo Libre Ensayo 5', scoreType: 'Z', descriptorScaleCode: 'NEURO_Z', requiresConversion: true, orderIndex: 1 },
  { testCode: 'TAVECI', key: 'TAVECI_TOTAL', name: 'Total Aprendizaje (A1–A5)', scoreType: 'Z', descriptorScaleCode: 'NEURO_Z', requiresConversion: true, orderIndex: 2 },
  { testCode: 'TAVECI', key: 'TAVECI_RL_LP', name: 'Recuerdo Libre Largo Plazo', scoreType: 'Z', descriptorScaleCode: 'NEURO_Z', requiresConversion: true, orderIndex: 3 },
  { testCode: 'TAVECI', key: 'TAVECI_RC_LP', name: 'Reconocimiento Largo Plazo', scoreType: 'Z', descriptorScaleCode: 'NEURO_Z', requiresConversion: true, orderIndex: 4 },

  // ── CARAS-R
  { testCode: 'CARAS-R', key: 'CARAS_A', name: 'Aciertos', scoreType: 'Z', descriptorScaleCode: 'NEURO_Z', requiresConversion: true, orderIndex: 1 },
  { testCode: 'CARAS-R', key: 'CARAS_E', name: 'Errores', scoreType: 'Z', descriptorScaleCode: 'NEURO_Z', requiresConversion: true, isInverse: true, orderIndex: 2 },
  { testCode: 'CARAS-R', key: 'CARAS_IND', name: 'Índice de Eficiencia', scoreType: 'Z', descriptorScaleCode: 'NEURO_Z', requiresConversion: true, orderIndex: 3 },

  // ── TFCRO (Figura Compleja de Rey-Osterrieth)
  { testCode: 'TFCRO', key: 'TFCRO_COPIA', name: 'Copia', scoreType: 'Z', descriptorScaleCode: 'NEURO_Z', requiresConversion: true, orderIndex: 1 },
  { testCode: 'TFCRO', key: 'TFCRO_MEM30', name: 'Memoria 30 min', scoreType: 'Z', descriptorScaleCode: 'NEURO_Z', requiresConversion: true, orderIndex: 2 },

  // ── ADOS-2 (Calibrated Severity Score 1–10)
  { testCode: 'ADOS-2', key: 'ADOS2_CSS', name: 'Calibrated Severity Score', scoreType: 'RAW', descriptorScaleCode: 'NEURO_Z', orderIndex: 1 },

  // ── ADI-R (algoritmos diagnósticos)
  { testCode: 'ADI-R', key: 'ADIR_SOC', name: 'Algoritmo Social', scoreType: 'RAW', descriptorScaleCode: 'NEURO_Z', orderIndex: 1 },
  { testCode: 'ADI-R', key: 'ADIR_COM', name: 'Algoritmo Comunicación', scoreType: 'RAW', descriptorScaleCode: 'NEURO_Z', orderIndex: 2 },
  { testCode: 'ADI-R', key: 'ADIR_RRB', name: 'Algoritmo Conductas Restringidas/Repetitivas', scoreType: 'RAW', descriptorScaleCode: 'NEURO_Z', orderIndex: 3 },

  // ── BASC-3 (cuestionarios, puntos de corte T: ≥60 limítrofe, ≥70 clínicamente significativo)
  { testCode: 'BASC-3', key: 'BASC3_HIPERACT', name: 'Hiperactividad', scoreType: 'T', descriptorScaleCode: 'NEURO_Z', cutoffBorderline: 60, cutoffClinicallySignificant: 70, orderIndex: 1 },
  { testCode: 'BASC-3', key: 'BASC3_AGRESI', name: 'Agresividad', scoreType: 'T', descriptorScaleCode: 'NEURO_Z', cutoffBorderline: 60, cutoffClinicallySignificant: 70, orderIndex: 2 },
  { testCode: 'BASC-3', key: 'BASC3_CONDUC', name: 'Problemas de Conducta', scoreType: 'T', descriptorScaleCode: 'NEURO_Z', cutoffBorderline: 60, cutoffClinicallySignificant: 70, orderIndex: 3 },
  { testCode: 'BASC-3', key: 'BASC3_ANSIEDAD', name: 'Ansiedad', scoreType: 'T', descriptorScaleCode: 'NEURO_Z', cutoffBorderline: 60, cutoffClinicallySignificant: 70, orderIndex: 4 },
  { testCode: 'BASC-3', key: 'BASC3_DEPRESION', name: 'Depresión', scoreType: 'T', descriptorScaleCode: 'NEURO_Z', cutoffBorderline: 60, cutoffClinicallySignificant: 70, orderIndex: 5 },
  { testCode: 'BASC-3', key: 'BASC3_SOMATIZ', name: 'Somatización', scoreType: 'T', descriptorScaleCode: 'NEURO_Z', cutoffBorderline: 60, cutoffClinicallySignificant: 70, orderIndex: 6 },
  { testCode: 'BASC-3', key: 'BASC3_ATENCI', name: 'Problemas de Atención', scoreType: 'T', descriptorScaleCode: 'NEURO_Z', cutoffBorderline: 60, cutoffClinicallySignificant: 70, orderIndex: 7 },
  { testCode: 'BASC-3', key: 'BASC3_RETIRADA', name: 'Retraimiento', scoreType: 'T', descriptorScaleCode: 'NEURO_Z', cutoffBorderline: 60, cutoffClinicallySignificant: 70, orderIndex: 8 },

  // ── ASRS-18 (TDAH adultos, ≥14 = positivo para cribado parte A)
  { testCode: 'ASRS-18', key: 'ASRS_A', name: 'Parte A (cribado)', scoreType: 'RAW', descriptorScaleCode: 'NEURO_Z', cutoffBorderline: 12, cutoffClinicallySignificant: 14, orderIndex: 1 },
  { testCode: 'ASRS-18', key: 'ASRS_B', name: 'Parte B', scoreType: 'RAW', descriptorScaleCode: 'NEURO_Z', orderIndex: 2 },
  { testCode: 'ASRS-18', key: 'ASRS_TOTAL', name: 'Total', scoreType: 'RAW', descriptorScaleCode: 'NEURO_Z', cutoffBorderline: 24, cutoffClinicallySignificant: 36, orderIndex: 3 },

  // ── DEX-Sp (Dysexecutive Questionnaire)
  { testCode: 'DEX-SP', key: 'DEX_TOTAL', name: 'Puntuación Total', scoreType: 'RAW', descriptorScaleCode: 'NEURO_Z', cutoffBorderline: 35, cutoffClinicallySignificant: 50, orderIndex: 1 },

  // ── BAI (Beck Anxiety Inventory, ≥22 ansiedad moderada, ≥36 severa)
  { testCode: 'BAI', key: 'BAI_TOTAL', name: 'Puntuación Total', scoreType: 'RAW', descriptorScaleCode: 'NEURO_Z', cutoffBorderline: 16, cutoffClinicallySignificant: 22, orderIndex: 1 },

  // ── BDI-II (Beck Depression Inventory-II, ≥20 moderada, ≥29 severa)
  { testCode: 'BDI-II', key: 'BDI_TOTAL', name: 'Puntuación Total', scoreType: 'RAW', descriptorScaleCode: 'NEURO_Z', cutoffBorderline: 14, cutoffClinicallySignificant: 20, orderIndex: 1 },
];

export async function seedTestScoreSlots(prisma: PrismaClient) {
  for (const slot of SLOTS) {
    const test = await prisma.cognitiveTest.findUnique({ where: { code: slot.testCode } });
    if (!test) {
      console.warn(`  ⚠ Test no encontrado: ${slot.testCode}`);
      continue;
    }

    const data = {
      key: slot.key,
      name: slot.name,
      scoreType: slot.scoreType,
      descriptorScaleCode: slot.descriptorScaleCode,
      requiresConversion: slot.requiresConversion ?? false,
      isInverse: slot.isInverse ?? false,
      cutoffBorderline: slot.cutoffBorderline ?? null,
      cutoffClinicallySignificant: slot.cutoffClinicallySignificant ?? null,
      orderIndex: slot.orderIndex,
    };

    await prisma.testScoreSlot.upsert({
      where: { testId_key: { testId: test.id, key: slot.key } },
      update: data,
      create: { testId: test.id, ...data },
    });
  }
  console.log(`✓ Test score slots seeded (${SLOTS.length} slots)`);
}
