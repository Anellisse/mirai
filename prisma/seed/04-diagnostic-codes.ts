import { PrismaClient } from '@prisma/client';

const CODES = [
  // Neurodesarrollo
  { code: 'F84.0', name: 'Trastorno del Espectro Autista', category: 'Trastornos del Neurodesarrollo', specifiers: ['Con discapacidad intelectual acompañante', 'Sin discapacidad intelectual acompañante', 'Con deterioro del lenguaje', 'Sin deterioro del lenguaje', 'Asociado a afección médica o genética conocida', 'Con catatonía'] },
  { code: 'F90.0', name: 'TDAH presentación combinada', category: 'Trastornos del Neurodesarrollo', specifiers: ['Leve', 'Moderado', 'Grave', 'En remisión parcial'] },
  { code: 'F90.1', name: 'TDAH presentación predominantemente inatenta', category: 'Trastornos del Neurodesarrollo', specifiers: ['Leve', 'Moderado', 'Grave', 'En remisión parcial'] },
  { code: 'F90.2', name: 'TDAH presentación predominantemente hiperactiva-impulsiva', category: 'Trastornos del Neurodesarrollo', specifiers: ['Leve', 'Moderado', 'Grave', 'En remisión parcial'] },
  { code: 'F70', name: 'Discapacidad intelectual leve', category: 'Trastornos del Neurodesarrollo', specifiers: ['Con leve deterioro del comportamiento', 'Sin perturbación del comportamiento'] },
  { code: 'F71', name: 'Discapacidad intelectual moderada', category: 'Trastornos del Neurodesarrollo', specifiers: [] },
  { code: 'F72', name: 'Discapacidad intelectual grave', category: 'Trastornos del Neurodesarrollo', specifiers: [] },
  { code: 'F73', name: 'Discapacidad intelectual profunda', category: 'Trastornos del Neurodesarrollo', specifiers: [] },
  { code: 'F80.0', name: 'Trastorno de la articulación (fonológico)', category: 'Trastornos del Neurodesarrollo', specifiers: [] },
  { code: 'F80.1', name: 'Trastorno del lenguaje', category: 'Trastornos del Neurodesarrollo', specifiers: [] },
  { code: 'F80.89', name: 'Trastorno de la comunicación social (pragmático)', category: 'Trastornos del Neurodesarrollo', specifiers: [] },
  { code: 'F80.81', name: 'Trastorno de la fluidez de inicio en la infancia (tartamudeo)', category: 'Trastornos del Neurodesarrollo', specifiers: [] },
  { code: 'F81.0', name: 'Trastorno específico del aprendizaje con dificultad en la lectura', category: 'Trastornos del Neurodesarrollo', specifiers: ['Leve', 'Moderado', 'Grave', 'Con dificultades en precisión lectora', 'Con dificultades en comprensión lectora'] },
  { code: 'F81.2', name: 'Trastorno específico del aprendizaje con dificultad en las matemáticas', category: 'Trastornos del Neurodesarrollo', specifiers: ['Leve', 'Moderado', 'Grave'] },
  { code: 'F81.81', name: 'Trastorno específico del aprendizaje con dificultad en la expresión escrita', category: 'Trastornos del Neurodesarrollo', specifiers: ['Leve', 'Moderado', 'Grave'] },
  { code: 'F82', name: 'Trastorno del desarrollo de la coordinación (TAC/DCD)', category: 'Trastornos del Neurodesarrollo', specifiers: [] },
  { code: 'F95.0', name: 'Trastorno de tics provisional', category: 'Trastornos del Neurodesarrollo', specifiers: [] },
  { code: 'F95.1', name: 'Trastorno de tics motores o vocales crónicos persistentes', category: 'Trastornos del Neurodesarrollo', specifiers: ['Solo motor', 'Solo vocal'] },
  { code: 'F95.2', name: 'Síndrome de Tourette', category: 'Trastornos del Neurodesarrollo', specifiers: [] },
  // Ansiedad
  { code: 'F41.1', name: 'Trastorno de ansiedad generalizada', category: 'Trastornos de Ansiedad', specifiers: [] },
  { code: 'F40.10', name: 'Trastorno de ansiedad social (fobia social)', category: 'Trastornos de Ansiedad', specifiers: ['Solo actuación'] },
  { code: 'F40.218', name: 'Fobia específica a animales', category: 'Trastornos de Ansiedad', specifiers: [] },
  { code: 'F40.228', name: 'Fobia específica a entorno natural', category: 'Trastornos de Ansiedad', specifiers: [] },
  { code: 'F40.230', name: 'Fobia específica a sangre', category: 'Trastornos de Ansiedad', specifiers: [] },
  { code: 'F40.248', name: 'Fobia específica situacional', category: 'Trastornos de Ansiedad', specifiers: [] },
  { code: 'F41.0', name: 'Trastorno de pánico', category: 'Trastornos de Ansiedad', specifiers: [] },
  { code: 'F93.0', name: 'Trastorno de ansiedad por separación', category: 'Trastornos de Ansiedad', specifiers: [] },
  { code: 'F94.0', name: 'Mutismo selectivo', category: 'Trastornos de Ansiedad', specifiers: [] },
  { code: 'F40.00', name: 'Agorafobia', category: 'Trastornos de Ansiedad', specifiers: [] },
  // Depresivos
  { code: 'F32.0', name: 'Trastorno depresivo mayor, episodio único leve', category: 'Trastornos Depresivos', specifiers: [] },
  { code: 'F32.1', name: 'Trastorno depresivo mayor, episodio único moderado', category: 'Trastornos Depresivos', specifiers: [] },
  { code: 'F32.2', name: 'Trastorno depresivo mayor, episodio único grave sin características psicóticas', category: 'Trastornos Depresivos', specifiers: [] },
  { code: 'F32.3', name: 'Trastorno depresivo mayor, episodio único grave con características psicóticas', category: 'Trastornos Depresivos', specifiers: [] },
  { code: 'F33.0', name: 'Trastorno depresivo mayor recurrente, episodio leve', category: 'Trastornos Depresivos', specifiers: [] },
  { code: 'F33.1', name: 'Trastorno depresivo mayor recurrente, episodio moderado', category: 'Trastornos Depresivos', specifiers: [] },
  { code: 'F33.2', name: 'Trastorno depresivo mayor recurrente, episodio grave', category: 'Trastornos Depresivos', specifiers: [] },
  { code: 'F34.1', name: 'Trastorno depresivo persistente (distimia)', category: 'Trastornos Depresivos', specifiers: ['Inicio temprano', 'Inicio tardío', 'Con síndrome distímico puro', 'Con episodio depresivo mayor persistente'] },
  { code: 'F34.8', name: 'Trastorno disruptivo del estado de ánimo con desregulación emocional', category: 'Trastornos Depresivos', specifiers: [] },
  // Trauma y Estrés
  { code: 'F43.10', name: 'Trastorno de estrés postraumático', category: 'Trauma y Estrés', specifiers: ['Con síntomas disociativos', 'Con expresión retardada'] },
  { code: 'F43.0', name: 'Trastorno de estrés agudo', category: 'Trauma y Estrés', specifiers: [] },
  { code: 'F43.21', name: 'Trastorno adaptativo con estado de ánimo depresivo', category: 'Trauma y Estrés', specifiers: [] },
  { code: 'F43.22', name: 'Trastorno adaptativo con ansiedad', category: 'Trauma y Estrés', specifiers: [] },
  { code: 'F43.23', name: 'Trastorno adaptativo mixto ansioso-depresivo', category: 'Trauma y Estrés', specifiers: [] },
  { code: 'F43.24', name: 'Trastorno adaptativo con perturbación de la conducta', category: 'Trauma y Estrés', specifiers: [] },
  { code: 'F94.1', name: 'Trastorno de apego reactivo', category: 'Trauma y Estrés', specifiers: [] },
  // TOC y Relacionados
  { code: 'F42.2', name: 'Trastorno obsesivo-compulsivo', category: 'TOC y Relacionados', specifiers: ['Con introspección buena o aceptable', 'Con introspección escasa', 'Sin introspección/con creencias delirantes', 'Con antecedentes de tics'] },
  { code: 'F63.3', name: 'Tricotilomanía (trastorno de arrancarse el cabello)', category: 'TOC y Relacionados', specifiers: [] },
  { code: 'L98.1', name: 'Trastorno de excoriación (pellizcarse la piel)', category: 'TOC y Relacionados', specifiers: [] },
  { code: 'F45.22', name: 'Trastorno dismórfico corporal', category: 'TOC y Relacionados', specifiers: ['Con introspección buena o aceptable', 'Con introspección escasa', 'Sin introspección/con creencias delirantes', 'Con dismorfia muscular'] },
  // Conducta
  { code: 'F91.3', name: 'Trastorno negativista desafiante (TOD)', category: 'Trastornos de la Conducta', specifiers: ['Leve', 'Moderado', 'Grave'] },
  { code: 'F91.1', name: 'Trastorno de conducta tipo de inicio en la infancia', category: 'Trastornos de la Conducta', specifiers: ['Leve', 'Moderado', 'Grave', 'Con emociones prosociales limitadas'] },
  { code: 'F91.2', name: 'Trastorno de conducta tipo de inicio en la adolescencia', category: 'Trastornos de la Conducta', specifiers: ['Leve', 'Moderado', 'Grave', 'Con emociones prosociales limitadas'] },
  { code: 'F63.81', name: 'Trastorno explosivo intermitente', category: 'Trastornos de la Conducta', specifiers: [] },
  // Bipolar
  { code: 'F31.0', name: 'Trastorno bipolar I, episodio maníaco actual o más reciente', category: 'Trastornos Bipolares', specifiers: ['Leve', 'Moderado', 'Grave', 'Con características psicóticas'] },
  { code: 'F31.81', name: 'Trastorno bipolar II', category: 'Trastornos Bipolares', specifiers: ['Episodio hipomaníaco actual', 'Episodio depresivo actual'] },
  { code: 'F34.0', name: 'Trastorno ciclotímico', category: 'Trastornos Bipolares', specifiers: [] },
  // Sueño
  { code: 'G47.00', name: 'Insomnio crónico', category: 'Trastornos del Sueño', specifiers: [] },
  { code: 'G47.10', name: 'Hipersomnia', category: 'Trastornos del Sueño', specifiers: [] },
  // Neurocognitivos
  { code: 'G31.84', name: 'Trastorno neurocognitivo leve (TCL)', category: 'Trastornos Neurocognitivos', specifiers: ['Sin perturbación del comportamiento', 'Con perturbación del comportamiento'] },
  { code: 'F02.80', name: 'Trastorno neurocognitivo mayor sin perturbación del comportamiento', category: 'Trastornos Neurocognitivos', specifiers: [] },
  { code: 'F02.81', name: 'Trastorno neurocognitivo mayor con perturbación del comportamiento', category: 'Trastornos Neurocognitivos', specifiers: [] },
  // Espectro Esquizofrénico
  { code: 'F20.9', name: 'Esquizofrenia', category: 'Trastornos del Espectro Esquizofrénico', specifiers: [] },
  { code: 'F25.0', name: 'Trastorno esquizoafectivo tipo bipolar', category: 'Trastornos del Espectro Esquizofrénico', specifiers: [] },
  { code: 'F25.1', name: 'Trastorno esquizoafectivo tipo depresivo', category: 'Trastornos del Espectro Esquizofrénico', specifiers: [] },
  { code: 'F21', name: 'Trastorno de la personalidad esquizotípica', category: 'Trastornos del Espectro Esquizofrénico', specifiers: [] },
  { code: 'F22', name: 'Trastorno delirante', category: 'Trastornos del Espectro Esquizofrénico', specifiers: [] },
  // Otros / Sin Diagnóstico
  { code: 'Z03.89', name: 'Sin diagnóstico (descartado)', category: 'Otros / Sin Diagnóstico', specifiers: [] },
  { code: 'Z13.89', name: 'Sospecha diagnóstica (en estudio)', category: 'Otros / Sin Diagnóstico', specifiers: [] },
  { code: 'R41.3', name: 'Otras quejas cognitivas', category: 'Otros / Sin Diagnóstico', specifiers: [] },
  { code: 'R41.89', name: 'Otras quejas de cognición y percepción', category: 'Otros / Sin Diagnóstico', specifiers: [] },
  { code: 'Z55.9', name: 'Problemas relacionados con la educación y la alfabetización', category: 'Otros / Sin Diagnóstico', specifiers: [] },
];

export async function seedDiagnosticCodes(prisma: PrismaClient) {
  console.log('  Seeding diagnostic codes...');
  for (const code of CODES) {
    await prisma.diagnosticCode.upsert({
      where: { code: code.code },
      update: code,
      create: code,
    });
  }
  console.log(`  ✓ ${CODES.length} diagnostic codes seeded`);
}
