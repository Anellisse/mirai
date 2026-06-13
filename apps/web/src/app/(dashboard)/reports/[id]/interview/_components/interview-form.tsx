'use client';

import { useRef, useState } from 'react';
import { apiClient, InterviewData } from '@/lib/api-client';

interface Props {
  reportId: string;
  initial: InterviewData;
}

type SectionKey = keyof InterviewData;

export function InterviewForm({ reportId, initial }: Props) {
  const [data, setData] = useState<InterviewData>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  // PDF extraction state
  const [pdfOpen, setPdfOpen] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [extractSuccess, setExtractSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function updateField(section: SectionKey, field: string, value: string | boolean) {
    setData(prev => ({
      ...prev,
      [section]: { ...(prev[section] as Record<string, unknown> ?? {}), [field]: value },
    }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true); setSaveError('');
    try {
      await apiClient.upsertInterview(reportId, data);
      setSaved(true);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleExtractPdf(file: File) {
    setExtracting(true); setExtractError(''); setExtractSuccess(false);
    try {
      const { extracted } = await apiClient.extractInterviewFromPdf(reportId, file);
      // Merge extracted data into form (overwrite only fields that have values)
      setData(prev => {
        const merged = { ...prev };
        for (const [sec, fields] of Object.entries(extracted)) {
          if (fields && typeof fields === 'object') {
            merged[sec as SectionKey] = {
              ...(prev[sec as SectionKey] as Record<string, unknown> ?? {}),
              ...(fields as Record<string, unknown>),
            };
          }
        }
        return merged;
      });
      setExtractSuccess(true);
      setSaved(false);
    } catch (e: unknown) {
      setExtractError(e instanceof Error ? e.message : 'Error al procesar el PDF.');
    } finally {
      setExtracting(false);
    }
  }

  function textField(section: SectionKey, field: string, label: string, rows = 2) {
    return (
      <div key={field}>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <textarea
          rows={rows}
          className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-400"
          value={(data[section] as any)?.[field] ?? ''}
          onChange={e => updateField(section, field, e.target.value)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Opción PDF ─────────────────────────────────────────── */}
      <div className="border border-dashed border-brand-300 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setPdfOpen(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3 bg-brand-50 hover:bg-brand-100 transition text-sm font-medium text-brand-700"
        >
          <span>📄 Subir ficha de anamnesis en PDF para pre-completar el formulario</span>
          <span className="text-brand-400 text-xs">{pdfOpen ? '▲ Ocultar' : '▼ Expandir'}</span>
        </button>

        {pdfOpen && (
          <div className="px-5 py-4 space-y-3 bg-white">
            <p className="text-xs text-gray-500">
              Suba el PDF de la entrevista anamnésica. La IA extraerá los datos y los cargará en el formulario a continuación
              para que pueda revisarlos y corregirlos antes de guardar.
            </p>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-1.5">
              El PDF debe contener texto seleccionable (no imágenes escaneadas). Si fue completado a mano,
              use el formulario directamente.
            </p>

            <div className="flex items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleExtractPdf(f);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={extracting}
                className="bg-brand-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
              >
                {extracting ? 'Extrayendo datos…' : 'Seleccionar PDF'}
              </button>
              {extracting && <span className="text-xs text-gray-400">Procesando con IA, puede demorar unos segundos…</span>}
            </div>

            {extractError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-md">{extractError}</p>
            )}
            {extractSuccess && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-md">
                ✓ Datos extraídos y cargados en el formulario. Revise y corrija lo que sea necesario antes de guardar.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Formulario manual ──────────────────────────────────── */}
      {([
        ['section2', 'Contexto familiar', [
          ['householdMembers', 'Composición del hogar'],
          ['householdRelationType', 'Tipo de relación parental (biparental, monoparental, reconstituida…)'],
          ['primaryCaregivers', 'Cuidadores principales'],
          ['psychosocialContext', 'Contexto psicosocial', 3],
        ]],
        ['section3', 'Historia del desarrollo', [
          ['pregnancyAndBirth', 'Embarazo y nacimiento'],
          ['psychomotorMilestones', 'Hitos psicomotores (gateo, marcha, etc.)'],
          ['languageDevelopment', 'Desarrollo del lenguaje'],
          ['sphincterControl', 'Control de esfínteres'],
        ]],
        ['section4', 'Conducta y sintomatología en la infancia', [
          ['childhoodBehavior', 'Conducta en la infancia'],
          ['childhoodSymptoms', 'Sintomatología en la infancia'],
          ['emotionalRegulationChildhood', 'Regulación emocional'],
          ['relationshipWithAuthority', 'Relación con la autoridad'],
        ]],
        ['section5', 'Sintomatología actual', [
          ['currentSymptomsDescription', 'Descripción de síntomas actuales', 3],
          ['dailyFunctioningImpact', 'Impacto en el funcionamiento diario'],
          ['currentTreatments', 'Tratamientos actuales'],
        ]],
        ['section6', 'Desarrollo social e intereses', [
          ['currentFriendships', 'Vínculos de amistad actuales'],
          ['currentSocialNetworks', 'Redes de apoyo social'],
          ['hobbiesAndInterests', 'Hobbies e intereses'],
        ]],
        ['section7', 'Historia escolar / laboral', [
          ['educationLevel', 'Nivel educacional actual o alcanzado'],
          ['receivedSupport', 'Apoyos recibidos (PIE, psicopedagogía, fonoaudiología, etc.)'],
          ['workSituation', 'Situación laboral (adultos)'],
        ]],
        ['section8', 'Antecedentes médicos', [
          ['previousDiagnoses', 'Diagnósticos previos'],
          ['currentMedication', 'Medicación actual (nombre + dosis)'],
          ['hospitalizationsTraumas', 'Hospitalizaciones, cirugías, traumatismos'],
          ['previousEvaluations', 'Evaluaciones psicológicas o neuropsicológicas previas'],
          ['familyMedicalHistory', 'Antecedentes médicos familiares relevantes'],
        ]],
      ] as [SectionKey, string, [string, string, number?][]][]).map(([sectionKey, title, fields]) => (
        <section key={sectionKey} className="border rounded-lg p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 border-b pb-2">{title}</h3>
          <div className="space-y-4">
            {fields.map(([field, label, rows]) => textField(sectionKey, field, label, rows ?? 2))}
          </div>
        </section>
      ))}

      {/* ── Guardar ────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 sticky bottom-0 bg-white py-4 border-t">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar antecedentes'}
        </button>
        {saved && <span className="text-sm text-green-600">Guardado</span>}
        {saveError && <span className="text-sm text-red-600">{saveError}</span>}
      </div>
    </div>
  );
}
