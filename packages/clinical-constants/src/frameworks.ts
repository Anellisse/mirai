import { FrameworkCode } from '@mirai/shared-types';

export interface DomainConfig {
  code: string;
  name: string;
  axis?: number;
  orderIndex: number;
}

export interface FrameworkConfig {
  code: FrameworkCode;
  name: string;
  defaultIntelligenceTest: string;
  domains: DomainConfig[];
}

export const FRAMEWORKS: FrameworkConfig[] = [
  {
    code: FrameworkCode.SNP_CHC,
    name: 'SNP-CHC (Infanto-Juvenil)',
    defaultIntelligenceTest: 'WISC-V',
    domains: [
      { code: 'SENSORIOMOTOR_PRAXIAS', name: 'Sensoriomotor y praxias', axis: 1, orderIndex: 1 },
      { code: 'VISUOESPACIAL', name: 'Visuoespacial', axis: 2, orderIndex: 2 },
      { code: 'MEMORIA_EPISODICA_VERBAL', name: 'Memoria episódica verbal', axis: 2, orderIndex: 3 },
      { code: 'MEMORIA_EPISODICA_VISUAL', name: 'Memoria episódica visual', axis: 2, orderIndex: 4 },
      { code: 'FUNCIONES_EJECUTIVAS', name: 'Funciones ejecutivas', axis: 2, orderIndex: 5 },
      { code: 'ATENCION', name: 'Atención', axis: 3, orderIndex: 6 },
      { code: 'MEMORIA_TRABAJO', name: 'Memoria de trabajo', axis: 3, orderIndex: 7 },
      { code: 'VELOCIDAD_PROCESAMIENTO', name: 'Velocidad de procesamiento', axis: 3, orderIndex: 8 },
      { code: 'LENGUAJE', name: 'Lenguaje', axis: 4, orderIndex: 9 },
      { code: 'COGNICION_SOCIAL', name: 'Cognición social', axis: undefined, orderIndex: 10 },
    ],
  },
  {
    code: FrameworkCode.STANDARD,
    name: 'Estándar por funciones (Adultos)',
    defaultIntelligenceTest: 'WAIS-IV',
    domains: [
      { code: 'SENSORIOMOTOR', name: 'Sensoriomotor', orderIndex: 1 },
      { code: 'VISUOESPACIAL', name: 'Visuoespacial', orderIndex: 2 },
      { code: 'ATENCION', name: 'Atención', orderIndex: 3 },
      { code: 'LENGUAJE', name: 'Lenguaje', orderIndex: 4 },
      { code: 'MEMORIA', name: 'Memoria', orderIndex: 5 },
      { code: 'FUNCIONES_EJECUTIVAS', name: 'Funciones ejecutivas', orderIndex: 6 },
      { code: 'INTELIGENCIA', name: 'Inteligencia', orderIndex: 7 },
    ],
  },
];
