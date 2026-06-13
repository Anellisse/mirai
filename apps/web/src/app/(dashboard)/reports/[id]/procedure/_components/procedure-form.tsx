'use client';

import { useState } from 'react';
import { apiClient, ProcedureData, ProcedureSourceData, UpsertProcedureInput } from '@/lib/api-client';

interface TestOption {
  code: string;
  name: string;
  domain: string;
}

const TESTS_BY_FRAMEWORK: Record<string, TestOption[]> = {
  SNP_CHC: [
    { code: 'WISC-V', name: 'WISC-V', domain: 'Inteligencia' },
    { code: 'TFCRO', name: 'TFCRO', domain: 'Visuoespacial / Praxias' },
    { code: 'TAVECI', name: 'TAVECI', domain: 'Memoria episódica' },
    { code: 'WCST', name: 'WCST', domain: 'Funciones ejecutivas' },
    { code: 'TMT', name: 'TMT', domain: 'Funciones ejecutivas' },
    { code: 'CARAS-R', name: 'CARAS-R', domain: 'Atención' },
    { code: 'ADOS-2', name: 'ADOS-2', domain: 'Cognición social' },
    { code: 'ADI-R', name: 'ADI-R', domain: 'Cognición social' },
    { code: 'BASC-3', name: 'BASC-3', domain: 'Cuestionarios' },
  ],
  STANDARD: [
    { code: 'WAIS-IV', name: 'WAIS-IV', domain: 'Inteligencia' },
    { code: 'TFCRO', name: 'TFCRO', domain: 'Visuoespacial / Praxias' },
    { code: 'TAVEC', name: 'TAVEC', domain: 'Memoria' },
    { code: 'WCST', name: 'WCST', domain: 'Funciones ejecutivas' },
    { code: 'TMT', name: 'TMT', domain: 'Funciones ejecutivas' },
    { code: 'CARAS-R', name: 'CARAS-R', domain: 'Atención' },
    { code: 'ASRS-18', name: 'ASRS-18', domain: 'Cuestionarios' },
    { code: 'DEX-Sp', name: 'DEX-Sp', domain: 'Cuestionarios' },
    { code: 'BAI', name: 'BAI', domain: 'Cuestionarios' },
    { code: 'BDI-II', name: 'BDI-II', domain: 'Cuestionarios' },
  ],
};

const QUESTIONNAIRE_CODES = new Set(['BASC-3', 'ASRS-18', 'DEX-Sp', 'DEX-SP', 'BAI', 'BDI-II']);

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  CLINICIAN_REVIEWING: 'En revisión',
  APPROVED: 'Aprobado',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-600',
  CLINICIAN_REVIEWING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
};

interface Props {
  reportId: string;
  initial: ProcedureData;
}

export function ProcedureForm({ reportId, initial }: Props) {
  const tests = TESTS_BY_FRAMEWORK[initial.frameworkCode] ?? TESTS_BY_FRAMEWORK['SNP_CHC'];
  const saved = initial.procedureData as ProcedureSourceData | null;

  const [selectedTests, setSelectedTests] = useState<string[]>(initial.selectedTests);
  const [interviewWith, setInterviewWith] = useState<'PARENTS' | 'PATIENT' | 'BOTH' | 'NONE'>(saved?.interviewWith ?? 'PARENTS');
  const [interviewModality, setInterviewModality] = useState<'PRESENCIAL' | 'TELEPRESENCIAL'>(saved?.interviewModality ?? 'PRESENCIAL');
  const [adirModality, setAdirModality] = useState<'PRESENCIAL' | 'TELEPRESENCIAL'>(saved?.adirModality ?? 'PRESENCIAL');
  const [questionnairesShared, setQuestionnairesShared] = useState(saved?.questionnairesShared ?? false);
  const [questionnaireRespondent, setQuestionnaireRespondent] = useState<string | null>(saved?.questionnaireRespondent ?? null);
  const [questionnaireRespondentCustom, setQuestionnaireRespondentCustom] = useState(saved?.questionnaireRespondentCustom ?? '');
  const [content, setContent] = useState(initial.content ?? '');
  const [sectionStatus, setSectionStatus] = useState(initial.sectionStatus);

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const adirSelected = selectedTests.includes('ADI-R');
  const questionnaireTestsSelected = selectedTests.some(c => QUESTIONNAIRE_CODES.has(c));
  const isApproved = sectionStatus === 'APPROVED';

  function toggleTest(code: string) {
    setSelectedTests(prev => {
      const next = prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code];
      if (!next.some(c => QUESTIONNAIRE_CODES.has(c))) {
        setQuestionnairesShared(false);
        setQuestionnaireRespondent(null);
      }
      return next;
    });
    setMessage(null);
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setMessage(null);
    try {
      const input: UpsertProcedureInput = {
        selectedTests,
        interviewWith,
        interviewModality,
        adirModality,
        questionnairesShared,
        questionnaireRespondent: questionnairesShared
          ? (questionnaireRespondent as UpsertProcedureInput['questionnaireRespondent'])
          : null,
        questionnaireRespondentCustom:
          questionnaireRespondent === 'OTHER' ? questionnaireRespondentCustom : undefined,
      };
      const result = await apiClient.upsertProcedure(reportId, input);
      setContent(result.content ?? '');
      setSectionStatus(result.status);
      setMessage('Sección generada correctamente.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al generar.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveContent() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await apiClient.saveSection(reportId, 'PROCEDURE_TESTS', content);
      setSectionStatus(updated.status);
      setMessage('Cambios guardados.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove() {
    setApproving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await apiClient.approveSection(reportId, 'PROCEDURE_TESTS');
      setSectionStatus(updated.status);
      setMessage('Sección aprobada.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al aprobar.');
    } finally {
      setApproving(false);
    }
  }

  const byDomain = tests.reduce<Record<string, TestOption[]>>((acc, t) => {
    return { ...acc, [t.domain]: [...(acc[t.domain] ?? []), t] };
  }, {});

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-md">{error}</div>
      )}
      {message && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-md">{message}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Instrumentos */}
        <section className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b">
            <h3 className="font-semibold text-gray-900 text-sm">Instrumentos aplicados</h3>
          </div>
          <div className="px-4 py-4 space-y-4">
            {Object.entries(byDomain).map(([domain, items]) => (
              <div key={domain}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{domain}</p>
                <div className="space-y-2">
                  {items.map(t => (
                    <div key={t.code}>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTests.includes(t.code)}
                          onChange={() => toggleTest(t.code)}
                          disabled={isApproved}
                          className="rounded border-gray-300 text-blue-600"
                        />
                        <span className="text-sm">{t.name}</span>
                      </label>
                      {t.code === 'ADI-R' && adirSelected && (
                        <div className="ml-7 mt-1.5 flex gap-4">
                          {(['PRESENCIAL', 'TELEPRESENCIAL'] as const).map(m => (
                            <label key={m} className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                              <input
                                type="radio"
                                name="adirModality"
                                value={m}
                                checked={adirModality === m}
                                onChange={() => setAdirModality(m)}
                                disabled={isApproved}
                              />
                              {m === 'PRESENCIAL' ? 'Presencial' : 'Telepresencial'}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Procedimiento */}
        <section className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b">
            <h3 className="font-semibold text-gray-900 text-sm">Procedimiento</h3>
          </div>
          <div className="px-4 py-4 space-y-5">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Entrevista realizada con</label>
              <select
                value={interviewWith}
                onChange={e => setInterviewWith(e.target.value as 'PARENTS' | 'PATIENT' | 'BOTH' | 'NONE')}
                disabled={isApproved}
                className="w-full border rounded-md px-3 py-2 text-sm"
              >
                <option value="PARENTS">Padres / cuidadores</option>
                <option value="PATIENT">Paciente</option>
                <option value="BOTH">Paciente y padres</option>
                <option value="NONE">No se realizó</option>
              </select>
            </div>

            {interviewWith !== 'NONE' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Modalidad de la entrevista</label>
                <div className="flex gap-5">
                  {(['PRESENCIAL', 'TELEPRESENCIAL'] as const).map(m => (
                    <label key={m} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="interviewModality"
                        value={m}
                        checked={interviewModality === m}
                        onChange={() => setInterviewModality(m)}
                        disabled={isApproved}
                      />
                      {m === 'PRESENCIAL' ? 'Presencial' : 'Telepresencial'}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={questionnairesShared}
                  disabled={!questionnaireTestsSelected || isApproved}
                  onChange={e => {
                    setQuestionnairesShared(e.target.checked);
                    if (!e.target.checked) setQuestionnaireRespondent(null);
                  }}
                  className="rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm">Se enviaron cuestionarios</span>
              </label>
              {!questionnaireTestsSelected && (
                <p className="text-xs text-gray-400 mt-1 ml-7">
                  Seleccione al menos un cuestionario en la lista de instrumentos
                </p>
              )}
            </div>

            {questionnairesShared && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Respondidos por</label>
                <select
                  value={questionnaireRespondent ?? ''}
                  onChange={e => setQuestionnaireRespondent(e.target.value || null)}
                  disabled={isApproved}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar…</option>
                  <option value="FAMILY">Familia</option>
                  <option value="PATIENT">Paciente</option>
                  <option value="TEACHER">Docentes</option>
                  <option value="OTHER">Otro</option>
                </select>
              </div>
            )}

            {questionnairesShared && questionnaireRespondent === 'OTHER' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Especificar</label>
                <input
                  type="text"
                  value={questionnaireRespondentCustom}
                  onChange={e => setQuestionnaireRespondentCustom(e.target.value)}
                  disabled={isApproved}
                  placeholder="ej: para la abuela"
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>
            )}
          </div>
        </section>
      </div>

      {!isApproved && (
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-emerald-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          {generating ? 'Generando…' : 'Guardar y generar sección'}
        </button>
      )}

      {content && (
        <section className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">Texto generado</h3>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[sectionStatus] ?? 'bg-gray-100 text-gray-600'}`}>
              {STATUS_LABEL[sectionStatus] ?? sectionStatus}
            </span>
          </div>
          <div className="px-4 py-4 space-y-4">
            <textarea
              rows={16}
              readOnly={isApproved}
              className={`w-full border rounded-md px-3 py-2 text-sm leading-relaxed ${
                isApproved ? 'bg-gray-50 text-gray-700 cursor-default' : 'focus:outline-none focus:ring-1 focus:ring-blue-400'
              }`}
              value={content}
              onChange={e => { setContent(e.target.value); setMessage(null); }}
            />
            {!isApproved && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveContent}
                  disabled={saving}
                  className="bg-gray-700 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-40"
                >
                  {saving ? 'Guardando…' : 'Guardar cambios'}
                </button>
                <button
                  onClick={handleApprove}
                  disabled={approving || sectionStatus === 'PENDING'}
                  className="bg-blue-600 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-40"
                >
                  {approving ? 'Aprobando…' : 'Aprobar sección'}
                </button>
                {sectionStatus === 'PENDING' && (
                  <span className="text-xs text-gray-400">Genere la sección antes de aprobar.</span>
                )}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
