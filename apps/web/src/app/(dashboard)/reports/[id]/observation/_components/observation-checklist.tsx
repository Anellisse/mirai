'use client';

import { useState } from 'react';
import { apiClient, ObservationData } from '@/lib/api-client';

const SCALE_LABELS = ['Sin dificultad', 'Leve-moderado', 'Severo'] as const;

type ScaleKey = 'cooperacion' | 'motivacion' | 'ansiedad' | 'toleranciaFrustracion' |
  'atencionSostenida' | 'impulsividad' | 'fatiga' | 'comprensionInstrucciones' |
  'calidadLenguaje' | 'contactoVisual' | 'reciprocidadSocial' | 'relacionEvaluador' |
  'coordinacionMotora' | 'conductasEstereotipadas' | 'rigidezConductual';

const GROUPS: { label: string; items: { key: ScaleKey; label: string }[] }[] = [
  {
    label: 'Actitud y disposición',
    items: [
      { key: 'cooperacion', label: 'Cooperación' },
      { key: 'motivacion', label: 'Motivación' },
      { key: 'ansiedad', label: 'Ansiedad' },
      { key: 'toleranciaFrustracion', label: 'Tolerancia a la frustración' },
    ],
  },
  {
    label: 'Atención y actividad motora',
    items: [
      { key: 'atencionSostenida', label: 'Atención sostenida' },
      { key: 'impulsividad', label: 'Impulsividad' },
      { key: 'fatiga', label: 'Fatiga' },
    ],
  },
  {
    label: 'Comunicación y lenguaje',
    items: [
      { key: 'comprensionInstrucciones', label: 'Comprensión de instrucciones' },
      { key: 'calidadLenguaje', label: 'Calidad del lenguaje' },
    ],
  },
  {
    label: 'Interacción social',
    items: [
      { key: 'contactoVisual', label: 'Contacto visual' },
      { key: 'reciprocidadSocial', label: 'Reciprocidad social' },
      { key: 'relacionEvaluador', label: 'Relación con el evaluador' },
    ],
  },
  {
    label: 'Otros aspectos',
    items: [
      { key: 'coordinacionMotora', label: 'Coordinación motora' },
      { key: 'conductasEstereotipadas', label: 'Conductas estereotipadas' },
      { key: 'rigidezConductual', label: 'Rigidez conductual' },
    ],
  },
];

interface Props {
  reportId: string;
  initial: ObservationData;
}

export function ObservationChecklist({ reportId, initial }: Props) {
  const [data, setData] = useState<ObservationData>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof ObservationData>(key: K, value: ObservationData[K]) {
    setData((p) => ({ ...p, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await apiClient.upsertObservation(reportId, data);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Nivel de actividad (cualitativo) */}
      <section className="border rounded-lg p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Nivel de actividad motora</h3>
        <div className="flex gap-6">
          {(['hipo', 'normo', 'hiper'] as const).map((v) => (
            <label key={v} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="nivelActividad" value={v} checked={data.nivelActividad === v}
                onChange={() => set('nivelActividad', v)} />
              {v === 'hipo' ? 'Hipoactivo' : v === 'normo' ? 'Normativo' : 'Hiperactivo'}
            </label>
          ))}
        </div>
      </section>

      {/* Expresión verbal (cualitativo) */}
      <section className="border rounded-lg p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Expresión verbal</h3>
        <div className="flex gap-6">
          {(['fluida', 'reducida', 'excesiva'] as const).map((v) => (
            <label key={v} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="expresionVerbal" value={v} checked={data.expresionVerbal === v}
                onChange={() => set('expresionVerbal', v)} />
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </label>
          ))}
        </div>
      </section>

      {/* Ítems de escala por grupo */}
      {GROUPS.map((group) => (
        <section key={group.label} className="border rounded-lg p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">{group.label}</h3>
          <div className="space-y-4">
            {group.items.map(({ key, label }) => (
              <div key={key}>
                <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
                <div className="flex gap-8">
                  {SCALE_LABELS.map((sl, idx) => (
                    <label key={idx} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name={key} value={idx}
                        checked={data[key] === idx}
                        onChange={() => set(key, idx as any)} />
                      {sl}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Observaciones adicionales */}
      <section className="border rounded-lg p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Observaciones adicionales</h3>
        <textarea rows={4} className="w-full border rounded-md px-3 py-2 text-sm"
          value={data.additionalObservations ?? ''}
          onChange={(e) => set('additionalObservations', e.target.value)} />
      </section>

      <div className="flex items-center gap-4 sticky bottom-0 bg-white py-4 border-t">
        <button onClick={handleSave} disabled={saving}
          className="bg-blue-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Guardando…' : 'Guardar conducta observada'}
        </button>
        {saved && <span className="text-sm text-green-600">Guardado</span>}
      </div>
    </div>
  );
}
