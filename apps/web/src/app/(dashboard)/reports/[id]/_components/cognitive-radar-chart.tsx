'use client';

import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import { CognitiveProfileDomain } from '@/lib/api-client';

interface Props {
  data: CognitiveProfileDomain[];
  title?: string;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as CognitiveProfileDomain;
  return (
    <div className="bg-white border rounded shadow-md px-3 py-2 text-xs space-y-0.5">
      <p className="font-semibold text-gray-800">{d.domainName}</p>
      <p>Puntaje: <strong>{d.avgScore}</strong> / 7</p>
      <p className="text-gray-500">{d.descriptorLabel}</p>
    </div>
  );
};

export function CognitiveRadarChart({ data, title }: Props) {
  if (!data.length) return null;

  const chartData = data.map((d) => ({ ...d, score: d.avgScore }));

  return (
    <div>
      {title && <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">{title}</h4>}
      <ResponsiveContainer width="100%" height={320}>
        <RadarChart data={chartData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke="#E5E7EB" />
          <PolarAngleAxis
            dataKey="domainName"
            tick={{ fontSize: 11, fill: '#374151' }}
          />
          <PolarRadiusAxis
            domain={[0, 7]}
            tickCount={8}
            tick={{ fontSize: 9, fill: '#9CA3AF' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Radar
            name="Perfil cognitivo"
            dataKey="score"
            stroke="#3B82F6"
            fill="#3B82F6"
            fillOpacity={0.25}
            strokeWidth={2}
            dot={{ r: 4, fill: '#3B82F6' }}
          />
        </RadarChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-400 text-center mt-1">
        Escala 1–7: Muy bajo → Muy alto (a partir de descriptores por test)
      </p>
    </div>
  );
}
