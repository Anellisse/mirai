'use client';

import { useState } from 'react';
import { apiClient, SectionSummary } from '@/lib/api-client';

// ── Opciones clínicas ─────────────────────────────────────────────────────────

const REQUESTER_OPTIONS = [
  { value: 'familia',        label: 'Los padres / familia del paciente' },
  { value: 'paciente_mismo', label: 'El/la propio/a paciente' },
  { value: 'profesional',    label: 'Un profesional derivante' },
  { value: 'colegio',        label: 'El colegio / establecimiento educacional' },
  { value: 'institucion',    label: 'Una institución (empresa, mutual, etc.)' },
  { value: 'otro',           label: 'Otro' },
] as const;

const PROFESSIONAL_TYPES = [
  'Neurólogo/a', 'Psiquiatra', 'Médico general / Pediatra', 'Psicólogo/a',
  'Terapeuta ocupacional', 'Fonoaudiólogo/a', 'Kinesiólogo/a', 'Otro',
];

const REASON_OPTIONS = [
  'Dificultades en el rendimiento académico',
  'Sospecha de déficit atencional (TDAH)',
  'Dificultades en el lenguaje y la comunicación',
  'Sospecha de trastorno del espectro autista (TEA)',
  'Dificultades conductuales',
  'Dificultades emocionales (ansiedad, ánimo bajo)',
  'Dificultades sociales',
  'Retraso en el desarrollo',
  'Dificultades de memoria',
  'Dificultades ejecutivas (planificación, organización)',
  'Evaluación post-daño neurológico (ACV, TEC u otro)',
  'Control de tratamiento / seguimiento de evolución',
  'Evaluación pericial / judicial',
  'Otro',
];

const PURPOSE_OPTIONS = [
  'Indagar en la presencia de un diagnóstico diferencial',
  'Dilucidar diagnóstico',
  'Generar un perfil de fortalezas y debilidades',
  'Orientar estrategias de intervención',
  'Entregar estrategias para planificación educativa',
  'Evaluar capacidades laborales',
  'Realizar una evaluación pericial o judicial',
  'Realizar seguimiento de tratamiento y evolución',
  'Derivación a especialista',
  'Otro',
];

// ── Generación de texto ───────────────────────────────────────────────────────

function lowerReason(item: string): string {
  // "Sospecha de X" → "la sospecha de X" para que quede bien tras "ante"
  if (/^sospecha de /i.test(item)) return 'la ' + item.toLowerCase();
  return item.toLowerCase();
}

function joinList(items: string[], transform = (s: string) => s.toLowerCase()): string {
  if (items.length === 0) return '';
  if (items.length === 1) return transform(items[0]);
  return items.slice(0, -1).map(transform).join(', ') + ' y ' + transform(items[items.length - 1]);
}

export interface CRData {
  requesterType: string;
  requesterOtherText: string;
  professionalName: string;
  professionalType: string;
  professionalTypeOther: string;
  reasons: string[];
  reasonOther: string;
  purposes: string[];
  purposeOther: string;
}

function generateText(d: CRData): string {
  // Quién — complemento de "solicitada por"
  let quien = '';
  switch (d.requesterType) {
    case 'familia':
      quien = 'la familia del/la paciente'; break;
    case 'paciente_mismo':
      quien = 'el/la propio/a paciente'; break;
    case 'profesional': {
      const tipo = d.professionalType === 'Otro'
        ? (d.professionalTypeOther || 'profesional')
        : (d.professionalType || 'profesional');
      quien = d.professionalName
        ? `${d.professionalName}, ${tipo.toLowerCase()}`
        : `${tipo.toLowerCase()}`; break;
    }
    case 'colegio':
      quien = 'el establecimiento educacional'; break;
    case 'institucion':
      quien = d.requesterOtherText || 'la institución'; break;
    default:
      quien = d.requesterOtherText || 'quien consulta'; break;
  }

  // Razones — usar lowerReason para "la sospecha de..."
  const reasonsList = [...d.reasons.filter(r => r !== 'Otro')];
  if (d.reasons.includes('Otro') && d.reasonOther) reasonsList.push(d.reasonOther);
  const reasonsText = joinList(reasonsList, lowerReason);

  // Propósitos — ya vienen en forma verbal (Evaluar, Realizar, Orientar...)
  const purposesList = [...d.purposes.filter(p => p !== 'Otro')];
  if (d.purposes.includes('Otro') && d.purposeOther) purposesList.push(d.purposeOther);
  const purposesText = joinList(purposesList);

  let text = `Esta evaluación es solicitada por ${quien}`;
  if (reasonsText) text += `, ante ${reasonsText}`;
  text += '.';

  if (purposesText) {
    text += ` El objetivo de la presente evaluación es ${purposesText}.`;
  }

  return text;
}

// ── Componente ────────────────────────────────────────────────────────────────

const EMPTY: CRData = {
  requesterType: '', requesterOtherText: '', professionalName: '',
  professionalType: '', professionalTypeOther: '',
  reasons: [], reasonOther: '', purposes: [], purposeOther: '',
};

interface Props {
  reportId: string;
  initialSection: SectionSummary | null;
}

const inputCls = 'w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

export function ConsultationReasonForm({ reportId, initialSection }: Props) {
  const [data, setData] = useState<CRData>(() => {
    const src = initialSection?.aiRawOutput
      ? JSON.parse(initialSection.aiRawOutput) as CRData
      : EMPTY;
    return { ...EMPTY, ...src };
  });
  const [section, setSection] = useState<SectionSummary | null>(initialSection);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const preview = generateText(data);
  const isApproved = section?.status === 'APPROVED';

  function toggleList(field: 'reasons' | 'purposes', value: string) {
    setData(prev => {
      const list = prev[field];
      return {
        ...prev,
        [field]: list.includes(value) ? list.filter(v => v !== value) : [...list, value],
      };
    });
    setSaved(false);
  }

  async function handleSave() {
    if (!data.requesterType) { setError('Selecciona quién solicita la evaluación.'); return; }
    setSaving(true); setError(''); setSaved(false);
    try {
      const updated = await apiClient.saveSection(
        reportId, 'CONSULTATION_REASON', preview,
        { consultationReason: data },
      );
      setSection(prev => prev ? { ...prev, ...updated } : updated);
      setSaved(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove() {
    setApproving(true); setError('');
    try {
      const updated = await apiClient.approveSection(reportId, 'CONSULTATION_REASON');
      setSection(prev => prev ? { ...prev, ...updated, status: 'APPROVED' } : updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al aprobar.');
    } finally {
      setApproving(false);
    }
  }

  return (
    <div className="space-y-8">
      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 px-3 py-2 rounded-md">{error}</p>}

      {/* ── 1. Quién solicita ──────────────────────────────── */}
      <section className="border rounded-lg p-5">
        <h3 className="font-semibold text-gray-900 mb-4">¿Quién solicita la evaluación?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {REQUESTER_OPTIONS.map(opt => (
            <label key={opt.value} className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer text-sm transition
              ${data.requesterType === opt.value
                ? 'border-brand-500 bg-brand-50 text-brand-800 font-medium'
                : 'border-gray-200 hover:border-brand-300'}`}
            >
              <input
                type="radio"
                name="requesterType"
                value={opt.value}
                checked={data.requesterType === opt.value}
                onChange={() => setData(d => ({ ...d, requesterType: opt.value }))}
                className="accent-brand-600"
              />
              {opt.label}
            </label>
          ))}
        </div>

        {/* Texto libre para institución / otro */}
        {(data.requesterType === 'institucion' || data.requesterType === 'otro') && (
          <div className="mt-4">
            <label className={labelCls}>
              {data.requesterType === 'institucion' ? 'Nombre de la institución' : 'Especificar'}
            </label>
            <input
              value={data.requesterOtherText}
              onChange={e => setData(d => ({ ...d, requesterOtherText: e.target.value }))}
              className={inputCls}
            />
          </div>
        )}

        {/* Datos del profesional derivante */}
        {data.requesterType === 'profesional' && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nombre del profesional</label>
              <input
                value={data.professionalName}
                onChange={e => setData(d => ({ ...d, professionalName: e.target.value }))}
                placeholder="Ej: Dra. Ana Martínez"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Tipo de profesional</label>
              <select
                value={data.professionalType}
                onChange={e => setData(d => ({ ...d, professionalType: e.target.value }))}
                className={inputCls}
              >
                <option value="">Seleccionar…</option>
                {PROFESSIONAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {data.professionalType === 'Otro' && (
              <div className="col-span-2">
                <label className={labelCls}>Especificar tipo de profesional</label>
                <input
                  value={data.professionalTypeOther}
                  onChange={e => setData(d => ({ ...d, professionalTypeOther: e.target.value }))}
                  className={inputCls}
                />
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── 2. Por qué consulta ───────────────────────────── */}
      <section className="border rounded-lg p-5">
        <h3 className="font-semibold text-gray-900 mb-1">¿Cuál es el motivo de consulta?</h3>
        <p className="text-xs text-gray-400 mb-4">Puedes seleccionar más de uno.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {REASON_OPTIONS.map(opt => (
            <label key={opt} className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer text-sm transition
              ${data.reasons.includes(opt)
                ? 'border-brand-500 bg-brand-50 text-brand-800 font-medium'
                : 'border-gray-200 hover:border-brand-300'}`}
            >
              <input
                type="checkbox"
                checked={data.reasons.includes(opt)}
                onChange={() => toggleList('reasons', opt)}
                className="accent-brand-600"
              />
              {opt}
            </label>
          ))}
        </div>
        {data.reasons.includes('Otro') && (
          <div className="mt-3">
            <label className={labelCls}>Especificar otro motivo</label>
            <input
              value={data.reasonOther}
              onChange={e => setData(d => ({ ...d, reasonOther: e.target.value }))}
              className={inputCls}
            />
          </div>
        )}
      </section>

      {/* ── 3. Para qué ──────────────────────────────────── */}
      <section className="border rounded-lg p-5">
        <h3 className="font-semibold text-gray-900 mb-1">¿Cuál es el objetivo de la evaluación?</h3>
        <p className="text-xs text-gray-400 mb-4">Puedes seleccionar más de uno.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PURPOSE_OPTIONS.map(opt => (
            <label key={opt} className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer text-sm transition
              ${data.purposes.includes(opt)
                ? 'border-brand-500 bg-brand-50 text-brand-800 font-medium'
                : 'border-gray-200 hover:border-brand-300'}`}
            >
              <input
                type="checkbox"
                checked={data.purposes.includes(opt)}
                onChange={() => toggleList('purposes', opt)}
                className="accent-brand-600"
              />
              {opt}
            </label>
          ))}
        </div>
        {data.purposes.includes('Otro') && (
          <div className="mt-3">
            <label className={labelCls}>Especificar otro objetivo</label>
            <input
              value={data.purposeOther}
              onChange={e => setData(d => ({ ...d, purposeOther: e.target.value }))}
              className={inputCls}
            />
          </div>
        )}
      </section>

      {/* ── Preview ──────────────────────────────────────── */}
      {preview && (
        <section className="border border-brand-200 rounded-lg p-5 bg-brand-50">
          <h3 className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-2">
            Texto generado automáticamente
          </h3>
          <p className="text-sm text-gray-800 leading-relaxed">{preview}</p>
          <p className="text-xs text-gray-400 mt-2">
            Este texto quedará en la sección. Podrás editarlo manualmente en el editor si necesitas ajustarlo.
          </p>
        </section>
      )}

      {/* ── Acciones ─────────────────────────────────────── */}
      {!isApproved && (
        <div className="flex items-center gap-3 sticky bottom-0 bg-white py-3 border-t">
          <button
            onClick={handleSave}
            disabled={saving || !data.requesterType}
            className="bg-gray-700 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-40"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button
            onClick={handleApprove}
            disabled={approving || !saved && section?.status === 'PENDING'}
            className="bg-emerald-600 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-emerald-700 disabled:opacity-40"
          >
            {approving ? 'Aprobando…' : 'Aprobar sección'}
          </button>
          {saved && <span className="text-xs text-green-600">Guardado correctamente.</span>}
        </div>
      )}
      {isApproved && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 px-4 py-2 rounded-md">
          Sección aprobada.
        </p>
      )}
    </div>
  );
}
