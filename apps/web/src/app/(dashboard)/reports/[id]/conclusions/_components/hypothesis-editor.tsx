'use client';

import { useState } from 'react';
import { apiClient, DiagnosticCode, HypothesisData } from '@/lib/api-client';

interface Props {
  hypotheses: HypothesisData[];
  onChange: (h: HypothesisData[]) => void;
}

export function HypothesisEditor({ hypotheses, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DiagnosticCode[]>([]);
  const [searching, setSearching] = useState(false);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await apiClient.getDiagnosticCodes({ q: query });
      setResults(res);
    } finally {
      setSearching(false);
    }
  }

  function addCode(code: DiagnosticCode) {
    if (hypotheses.some((h) => h.dxCode === code.code)) return;
    onChange([
      ...hypotheses,
      { dxCode: code.code, dxName: code.name, specifiers: [], status: 'PROVISIONAL', orderIndex: hypotheses.length },
    ]);
    setResults([]);
    setQuery('');
  }

  function remove(idx: number) {
    onChange(hypotheses.filter((_, i) => i !== idx).map((h, i) => ({ ...h, orderIndex: i })));
  }

  function update(idx: number, patch: Partial<HypothesisData>) {
    onChange(hypotheses.map((h, i) => (i === idx ? { ...h, ...patch } : h)));
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Buscar código DSM-5-TR (ej: TDAH, F84.0)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1 border rounded-md px-3 py-2 text-sm"
        />
        <button onClick={handleSearch} disabled={searching}
          className="border px-4 py-2 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50">
          {searching ? '…' : 'Buscar'}
        </button>
      </div>

      {results.length > 0 && (
        <ul className="border rounded-md divide-y max-h-48 overflow-y-auto">
          {results.map((c) => (
            <li key={c.code}>
              <button onClick={() => addCode(c)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                <span className="font-mono text-gray-500 mr-2">{c.code}</span>{c.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {hypotheses.map((h, idx) => (
        <div key={h.dxCode} className="border rounded-lg p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-mono text-xs text-gray-500 mr-2">{h.dxCode}</span>
              <span className="text-sm font-medium">{h.dxName}</span>
            </div>
            <button onClick={() => remove(idx)} className="text-red-500 hover:text-red-700 text-xs">
              Eliminar
            </button>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
            <select className="border rounded px-2 py-1 text-sm"
              value={h.status}
              onChange={(e) => update(idx, { status: e.target.value as HypothesisData['status'] })}>
              <option value="PROVISIONAL">Provisional</option>
              <option value="CONFIRMED">Confirmado</option>
              <option value="RULE_OUT">Descartado</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Justificación</label>
            <textarea rows={2} className="w-full border rounded px-2 py-1 text-sm"
              value={h.justification ?? ''}
              onChange={(e) => update(idx, { justification: e.target.value })} />
          </div>
        </div>
      ))}
    </div>
  );
}
