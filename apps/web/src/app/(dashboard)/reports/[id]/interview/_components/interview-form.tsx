'use client';

import { useState } from 'react';
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

  function updateField(section: SectionKey, field: string, value: string | boolean) {
    setData((prev) => ({
      ...prev,
      [section]: { ...(prev[section] as Record<string, unknown> ?? {}), [field]: value },
    }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await apiClient.upsertInterview(reportId, data);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  function textField(section: SectionKey, field: string, label: string, rows = 2) {
    return (
      <div key={field}>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <textarea
          rows={rows}
          className="w-full border rounded-md px-3 py-2 text-sm"
          value={(data[section] as any)?.[field] ?? ''}
          onChange={(e) => updateField(section, field, e.target.value)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Sección 1 */}
      <section className="border rounded-lg p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">1. Motivo de consulta</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">¿Quién consulta?</label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={(data.section1 as any)?.whoConsults ?? ''}
              onChange={(e) => updateField('section1', 'whoConsults', e.target.value)}
            >
              <option value="">Seleccionar</option>
              <option value="paciente">Paciente</option>
              <option value="padres">Padres / apoderados</option>
              <option value="institucion">Institución</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          {textField('section1', 'whyConsults', 'Motivo de consulta', 3)}
          {textField('section1', 'purposeOfEvaluation', 'Propósito de la evaluación', 2)}
        </div>
      </section>

      {/* Sección 2 */}
      <section className="border rounded-lg p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">2. Contexto familiar</h3>
        <div className="space-y-4">
          {textField('section2', 'householdMembers', 'Composición del hogar')}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de relación parental</label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={(data.section2 as any)?.householdRelationType ?? ''}
              onChange={(e) => updateField('section2', 'householdRelationType', e.target.value)}
            >
              <option value="">Seleccionar</option>
              <option value="biparental">Biparental</option>
              <option value="monoparental">Monoparental</option>
              <option value="reconstituida">Reconstituida</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          {textField('section2', 'primaryCaregivers', 'Cuidadores principales')}
          {textField('section2', 'psychosocialContext', 'Contexto psicosocial', 3)}
        </div>
      </section>

      {/* Secciones 3–8 */}
      {([
        ['section3', '3. Historia del desarrollo', [
          ['pregnancyAndBirth', 'Embarazo y nacimiento'],
          ['psychomotorMilestones', 'Hitos psicomotores'],
          ['languageDevelopment', 'Desarrollo del lenguaje'],
          ['sphincterControl', 'Control de esfínteres'],
        ]],
        ['section4', '4. Conducta y sintomatología en la infancia', [
          ['childhoodBehavior', 'Conducta en la infancia'],
          ['childhoodSymptoms', 'Sintomatología en la infancia'],
          ['emotionalRegulationChildhood', 'Regulación emocional'],
          ['relationshipWithAuthority', 'Relación con la autoridad'],
        ]],
        ['section5', '5. Sintomatología actual', [
          ['currentSymptomsDescription', 'Descripción síntomas actuales'],
          ['dailyFunctioningImpact', 'Impacto en funcionamiento diario'],
          ['currentTreatments', 'Tratamientos actuales'],
        ]],
        ['section6', '6. Desarrollo social y hobbies', [
          ['currentFriendships', 'Amistades actuales'],
          ['currentSocialNetworks', 'Redes sociales actuales'],
          ['hobbiesAndInterests', 'Hobbies e intereses'],
        ]],
        ['section7', '7. Historia escolar / laboral', [
          ['educationLevel', 'Nivel educacional'],
          ['receivedSupport', 'Apoyos recibidos (PIE, psicopedagogía, etc.)'],
          ['workSituation', 'Situación laboral (adultos)'],
        ]],
        ['section8', '8. Antecedentes médicos', [
          ['previousDiagnoses', 'Diagnósticos previos'],
          ['currentMedication', 'Medicación actual (nombre + dosis)'],
          ['hospitalizationsTraumas', 'Hospitalizaciones y traumas'],
          ['previousEvaluations', 'Evaluaciones previas'],
          ['familyMedicalHistory', 'Historia médica familiar'],
        ]],
      ] as [SectionKey, string, [string, string][]][]).map(([sectionKey, title, fields]) => (
        <section key={sectionKey} className="border rounded-lg p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">{title}</h3>
          <div className="space-y-4">
            {fields.map(([field, label]) => textField(sectionKey, field, label))}
          </div>
        </section>
      ))}

      <div className="flex items-center gap-4 sticky bottom-0 bg-white py-4 border-t">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar antecedentes'}
        </button>
        {saved && <span className="text-sm text-green-600">Guardado</span>}
      </div>
    </div>
  );
}
