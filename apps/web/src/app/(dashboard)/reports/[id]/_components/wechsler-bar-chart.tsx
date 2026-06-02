'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import { WechslerIndexRow } from '@/lib/api-client';

interface Props {
  data: WechslerIndexRow[];
  title?: string;
}

function scoreColor(ss: number | null): string {
  if (ss === null) return '#9CA3AF';
  if (ss >= 120) return '#16A34A';
  if (ss >= 110) return '#4ADE80';
  if (ss >= 90) return '#3B82F6';
  if (ss >= 80) return '#FBBF24';
  if (ss >= 70) return '#F97316';
  return '#EF4444';
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as WechslerIndexRow;
  return (
    <div className="bg-white border rounded shadow-md px-3 py-2 text-xs space-y-0.5">
      <p className="font-semibold text-gray-800">{d.slotName}</p>
      <p>SS: <strong>{d.standardScore ?? '—'}</strong></p>
      {d.percentile != null && <p>Pc: {Math.round(d.percentile)}</p>}
      {d.descriptor && <p className="text-gray-500">{d.descriptor}</p>}
    </div>
  );
};

export function WechslerBarChart({ data, title }: Props) {
  if (!data.length) return null;

  const chartData = data.map((d) => ({ ...d, value: d.standardScore ?? 0 }));

  return (
    <div>
      {title && <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">{title}</h4>}
      <ResponsiveContainer width="100%" height={data.length * 48 + 40}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 60, bottom: 4, left: 160 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
          <XAxis
            type="number"
            domain={[50, 150]}
            ticks={[55, 70, 80, 90, 100, 110, 120, 130, 145]}
            tick={{ fontSize: 10, fill: '#6B7280' }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="slotName"
            tick={{ fontSize: 11, fill: '#374151' }}
            tickLine={false}
            width={155}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F3F4F6' }} />
          <ReferenceLine x={100} stroke="#6B7280" strokeDasharray="4 2" strokeWidth={1.5} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={24}>
            {chartData.map((entry, idx) => (
              <Cell key={idx} fill={scoreColor(entry.standardScore)} />
            ))}
            <LabelList dataKey="value" position="right" style={{ fontSize: 11, fill: '#374151', fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
