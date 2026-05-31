export interface ScoreDescriptor {
  level: number;
  label: string;
  percentileRange: [number, number];
  ssRange?: [number, number];
}

export const SCORE_DESCRIPTORS: ScoreDescriptor[] = [
  { level: 1, label: 'Muy bajo', percentileRange: [0, 5], ssRange: [40, 70] },
  { level: 2, label: 'Bajo', percentileRange: [6, 16], ssRange: [71, 84] },
  { level: 3, label: 'Promedio bajo', percentileRange: [17, 24], ssRange: [85, 89] },
  { level: 4, label: 'Promedio', percentileRange: [25, 74], ssRange: [90, 109] },
  { level: 5, label: 'Promedio alto', percentileRange: [75, 83], ssRange: [110, 115] },
  { level: 6, label: 'Alto', percentileRange: [84, 94], ssRange: [116, 129] },
  { level: 7, label: 'Muy alto', percentileRange: [95, 100], ssRange: [130, 160] },
];

export function descriptorFromStandardScore(ss: number): ScoreDescriptor {
  return (
    SCORE_DESCRIPTORS.find(
      (d) => d.ssRange && ss >= d.ssRange[0] && ss <= d.ssRange[1],
    ) ?? SCORE_DESCRIPTORS[0]
  );
}

export function descriptorFromPercentile(p: number): ScoreDescriptor {
  return (
    SCORE_DESCRIPTORS.find(
      (d) => p >= d.percentileRange[0] && p <= d.percentileRange[1],
    ) ?? SCORE_DESCRIPTORS[0]
  );
}
