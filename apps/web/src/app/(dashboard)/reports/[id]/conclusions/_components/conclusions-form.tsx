'use client';

import { useState } from 'react';
import { apiClient, ConclusionData, HypothesisData } from '@/lib/api-client';
import { HypothesisEditor } from './hypothesis-editor';

interface Props {
  reportId: string;
  initial: ConclusionData;
}

export function ConclusionsForm({ reportId, initial }: Props) {
  const [data, setData] = useState<ConclusionData>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function patch(update: Partial<ConclusionData>) {
    setData((p) => ({ ...p, ...update }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const result = await apiClient.upsertConclusion(reportId, {
        processNarrative: data.processNarrative,
        cognitiveImpact: data.cognitiveImpact,
        emotionalNote: data.emotionalNote,
        includeEmotionalNote: data.includeEmotionalNote,
        closingNote: data.closingNote,
        hypotheses: data.hypotheses,
      });
      setData(result);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="border rounded-lg p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Bloque 1 — Resumen conductual del proceso</h3>
        <p className="text-xs text-gray-500 mb-4">Pre-llenado desde conducta observada. Edite libremente.</p>
        <textarea rows={5} className="w-full border rounded-md px-3 py-2 text-sm"
          value={data.processNarrative ?? ''}
          onChange={(e) => patch({ processNarrative: e.target.value })} />
      </section>

      <section className="border rounded-lg p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Bloque 2 — Diagnóstico(s) con especificadores</h3>
        <HypothesisEditor
          hypotheses={data.hypotheses}
          onChange={(h: HypothesisData[]) => patch({ hypotheses: h })}
        />
      </section>

      <section className="border rounded-lg p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Bloque 3 — Impacto cognitivo actual</h3>
        <textarea rows={4} className="w-full border rounded-md px-3 py-2 text-sm"
          value={data.cognitiveImpact ?? ''}
          onChange={(e) => patch({ cognitiveImpact: e.target.value })} />
      </section>

      <section className="border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Bloque 4 — Sintomatología emocional</h3>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={data.includeEmotionalNote}
              onChange={(e) => patch({ includeEmotionalNote: e.target.checked })} />
            Incluir en el informe
          </label>
        </div>
        <textarea rows={4}
          className="w-full border rounded-md px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400"
          disabled={!data.includeEmotionalNote}
          value={data.emotionalNote ?? ''}
          onChange={(e) => patch({ emotionalNote: e.target.value })} />
      </section>

      <section className="border rounded-lg p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Bloque 5 — Párrafo de cierre</h3>
        <p className="text-xs text-gray-500 mb-4">Pre-cargado desde plantilla de la organización.</p>
        <textarea rows={3} className="w-full border rounded-md px-3 py-2 text-sm"
          value={data.closingNote ?? ''}
          onChange={(e) => patch({ closingNote: e.target.value })} />
      </section>

      <div className="flex items-center gap-4 sticky bottom-0 bg-white py-4 border-t">
        <button onClick={handleSave} disabled={saving}
          className="bg-blue-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Guardando…' : 'Guardar conclusiones'}
        </button>
        {saved && <span className="text-sm text-green-600">Guardado</span>}
      </div>
    </div>
  );
}
