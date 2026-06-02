import { PrismaClient } from '@prisma/client';

const SCALES = [
  {
    code: 'NEURO_Z',
    name: 'Neuropsicológica Z',
    scoreType: 'Z',
    isDefault: true,
    ranges: [
      { minScore: -99, maxScore: -2.01, label: 'Muy bajo', labelShort: 'MB', orderIndex: 1 },
      { minScore: -2.0, maxScore: -1.51, label: 'Bajo', labelShort: 'B', orderIndex: 2 },
      { minScore: -1.5, maxScore: -1.01, label: 'Bajo promedio', labelShort: 'BP', orderIndex: 3 },
      { minScore: -1.0, maxScore: 0.99, label: 'Promedio', labelShort: 'P', orderIndex: 4 },
      { minScore: 1.0, maxScore: 1.49, label: 'Alto promedio', labelShort: 'AP', orderIndex: 5 },
      { minScore: 1.5, maxScore: 1.99, label: 'Alto', labelShort: 'A', orderIndex: 6 },
      { minScore: 2.0, maxScore: 99, label: 'Muy alto', labelShort: 'MA', orderIndex: 7 },
    ],
  },
  {
    code: 'NEURO_PERCENTILE',
    name: 'Neuropsicológica Percentil',
    scoreType: 'PERCENTILE',
    isDefault: false,
    ranges: [
      { minScore: 0, maxScore: 2, label: 'Muy bajo', labelShort: 'MB', orderIndex: 1 },
      { minScore: 3, maxScore: 6, label: 'Bajo', labelShort: 'B', orderIndex: 2 },
      { minScore: 7, maxScore: 15, label: 'Bajo promedio', labelShort: 'BP', orderIndex: 3 },
      { minScore: 16, maxScore: 84, label: 'Promedio', labelShort: 'P', orderIndex: 4 },
      { minScore: 85, maxScore: 92, label: 'Alto promedio', labelShort: 'AP', orderIndex: 5 },
      { minScore: 93, maxScore: 97, label: 'Alto', labelShort: 'A', orderIndex: 6 },
      { minScore: 98, maxScore: 100, label: 'Muy alto', labelShort: 'MA', orderIndex: 7 },
    ],
  },
  {
    code: 'WISC_SS',
    name: 'WISC-V Índices Compuestos (SS)',
    scoreType: 'SS',
    isDefault: false,
    ranges: [
      { minScore: 0, maxScore: 69, label: 'Extremadamente bajo', labelShort: 'EB', orderIndex: 1 },
      { minScore: 70, maxScore: 79, label: 'Limítrofe', labelShort: 'LM', orderIndex: 2 },
      { minScore: 80, maxScore: 89, label: 'Medio bajo', labelShort: 'MBaj', orderIndex: 3 },
      { minScore: 90, maxScore: 109, label: 'Medio', labelShort: 'M', orderIndex: 4 },
      { minScore: 110, maxScore: 119, label: 'Medio alto', labelShort: 'MAlt', orderIndex: 5 },
      { minScore: 120, maxScore: 129, label: 'Superior', labelShort: 'S', orderIndex: 6 },
      { minScore: 130, maxScore: 999, label: 'Muy alto', labelShort: 'MA', orderIndex: 7 },
    ],
  },
  {
    code: 'WISC_SCALED',
    name: 'WISC-V Escalares Subtests',
    scoreType: 'SCALED',
    isDefault: false,
    ranges: [
      { minScore: 1, maxScore: 3, label: 'Extremadamente bajo', labelShort: 'EB', orderIndex: 1 },
      { minScore: 4, maxScore: 5, label: 'Limítrofe', labelShort: 'LM', orderIndex: 2 },
      { minScore: 6, maxScore: 7, label: 'Medio bajo', labelShort: 'MBaj', orderIndex: 3 },
      { minScore: 8, maxScore: 11, label: 'Medio', labelShort: 'M', orderIndex: 4 },
      { minScore: 12, maxScore: 13, label: 'Medio alto', labelShort: 'MAlt', orderIndex: 5 },
      { minScore: 14, maxScore: 16, label: 'Superior', labelShort: 'S', orderIndex: 6 },
      { minScore: 17, maxScore: 19, label: 'Muy alto', labelShort: 'MA', orderIndex: 7 },
    ],
  },
  {
    code: 'WAIS_SS',
    name: 'WAIS-IV Índices Compuestos (SS)',
    scoreType: 'SS',
    isDefault: false,
    ranges: [
      { minScore: 0, maxScore: 69, label: 'Muy bajo', labelShort: 'MB', orderIndex: 1 },
      { minScore: 70, maxScore: 79, label: 'Limítrofe', labelShort: 'LM', orderIndex: 2 },
      { minScore: 80, maxScore: 89, label: 'Bajo el promedio', labelShort: 'BPr', orderIndex: 3 },
      { minScore: 90, maxScore: 109, label: 'Promedio', labelShort: 'Pr', orderIndex: 4 },
      { minScore: 110, maxScore: 119, label: 'Alto', labelShort: 'A', orderIndex: 5 },
      { minScore: 120, maxScore: 129, label: 'Superior', labelShort: 'S', orderIndex: 6 },
      { minScore: 130, maxScore: 999, label: 'Muy superior', labelShort: 'MS', orderIndex: 7 },
    ],
  },
  {
    code: 'WAIS_SCALED',
    name: 'WAIS-IV Escalares Subtests',
    scoreType: 'SCALED',
    isDefault: false,
    ranges: [
      { minScore: 1, maxScore: 3, label: 'Muy bajo', labelShort: 'MB', orderIndex: 1 },
      { minScore: 4, maxScore: 5, label: 'Limítrofe', labelShort: 'LM', orderIndex: 2 },
      { minScore: 6, maxScore: 7, label: 'Bajo el promedio', labelShort: 'BPr', orderIndex: 3 },
      { minScore: 8, maxScore: 11, label: 'Promedio', labelShort: 'Pr', orderIndex: 4 },
      { minScore: 12, maxScore: 13, label: 'Alto', labelShort: 'A', orderIndex: 5 },
      { minScore: 14, maxScore: 16, label: 'Superior', labelShort: 'S', orderIndex: 6 },
      { minScore: 17, maxScore: 19, label: 'Muy superior', labelShort: 'MS', orderIndex: 7 },
    ],
  },
];

export async function seedDescriptorScales(prisma: PrismaClient) {
  for (const scale of SCALES) {
    await prisma.descriptorScale.upsert({
      where: { code: scale.code },
      update: { name: scale.name, scoreType: scale.scoreType, isDefault: scale.isDefault },
      create: { code: scale.code, name: scale.name, scoreType: scale.scoreType, isDefault: scale.isDefault },
    });

    for (const range of scale.ranges) {
      const existing = await prisma.descriptorRange.findFirst({
        where: { scaleCode: scale.code, orderIndex: range.orderIndex },
      });
      if (existing) {
        await prisma.descriptorRange.update({
          where: { id: existing.id },
          data: range,
        });
      } else {
        await prisma.descriptorRange.create({
          data: { ...range, scaleCode: scale.code },
        });
      }
    }
  }
  console.log('✓ Descriptor scales seeded (6 escalas)');
}
