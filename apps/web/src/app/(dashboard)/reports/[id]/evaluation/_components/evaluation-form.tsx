'use client';

import { useRef, useState } from 'react';
import {
  apiClient,
  TestResultData, ScorePdfData, AnnexTablesData,
  WechslerIndexRow, WechslerSubtestRow, BatteryRow, QuestionnaireRow,
} from '@/lib/api-client';

const COGNITIVE_SECTIONS = ['COGNITIVE_EVALUATION', 'QUESTIONNAIRE_SYMPTOMS', 'SOCIAL_COGNITION', 'RESULTS_SYNTHESIS'];

const SCORE_TYPE_HINT: Record<string, string> = {
  SS: 'Compuesto (media 100, DE 15)',
  SCALED: 'Escalar (1–19)',
  Z: 'Puntaje Z',
  T: 'Puntaje T (media 50)',
  PERCENTILE: 'Percentil (0–100)',
  RAW: 'Puntaje bruto',
};

interface Props {
  reportId: string;
  selectedTests: string[];
  frameworkCode: string;
  initialTestResults: TestResultData[];
  initialScorePdfs: ScorePdfData[];
  initialAnnexTables: AnnexTablesData;
}

export function EvaluationForm({
  reportId, selectedTests, frameworkCode, initialTestResults, initialScorePdfs, initialAnnexTables,
}: Props) {
  // Map testId → scores
  const [scoresByTest, setScoresByTest] = useState<Record<string, Record<string, string>>>(() => {
    const init: Record<string, Record<string, string>> = {};
    for (const tr of initialTestResults) {
      init[tr.testId] = Object.fromEntries(
        Object.entries(tr.scores).map(([k, v]) => [k, v !== null ? String(v) : '']),
      );
    }
    return init;
  });

  const [testResults, setTestResults] = useState<TestResultData[]>(initialTestResults);
  const [scorePdfs, setScorePdfs] = useState<ScorePdfData[]>(initialScorePdfs);
  const [annexTables, setAnnexTables] = useState<AnnexTablesData>(initialAnnexTables);

  const [savingTest, setSavingTest] = useState<string | null>(null);
  const [savedTest, setSavedTest] = useState<string | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function updateScore(testId: string, slotKey: string, value: string) {
    setScoresByTest((prev) => ({
      ...prev,
      [testId]: { ...(prev[testId] ?? {}), [slotKey]: value },
    }));
    setSavedTest(null);
  }

  async function handleSave(testId: string) {
    setSavingTest(testId);
    setError(null);
    try {
      const rawScores = scoresByTest[testId] ?? {};
      const scores: Record<string, number | null> = {};
      for (const [k, v] of Object.entries(rawScores)) {
        scores[k] = v !== '' ? parseFloat(v) : null;
      }
      const updated = await apiClient.upsertTestScores(reportId, testId, scores);
      setTestResults((prev) => {
        const idx = prev.findIndex((t) => t.testId === testId);
        return idx >= 0 ? prev.map((t, i) => (i === idx ? updated : t)) : [...prev, updated];
      });
      setSavedTest(testId);
      // Refresh annex tables after saving
      const tables = await apiClient.getAnnexTables(reportId);
      setAnnexTables(tables);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar puntajes.');
    } finally {
      setSavingTest(null);
    }
  }

  async function handlePdfUpload(file: File) {
    setUploadingPdf(true);
    setError(null);
    try {
      const pdf = await apiClient.uploadScorePdf(reportId, file);
      setScorePdfs((prev) => [pdf, ...prev]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al subir PDF.');
    } finally {
      setUploadingPdf(false);
    }
  }

  async function handleDeletePdf(pdfId: string) {
    try {
      await apiClient.deleteScorePdf(reportId, pdfId);
      setScorePdfs((prev) => prev.filter((p) => p.id !== pdfId));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al eliminar PDF.');
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setGenerateResult(null);
    try {
      await apiClient.generateSections(reportId, COGNITIVE_SECTIONS);
      setGenerateResult('Secciones generadas correctamente. Puede revisarlas en el editor del informe.');
      // Refresh annex tables
      const tables = await apiClient.getAnnexTables(reportId);
      setAnnexTables(tables);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al generar secciones.');
    } finally {
      setGenerating(false);
    }
  }

  const testResultMap = Object.fromEntries(testResults.map((t) => [t.testId, t]));

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-md">{error}</div>
      )}

      {/* Score panels per test */}
      {testResults.length === 0 && selectedTests.length === 0 && (
        <p className="text-gray-500 text-sm">No hay tests seleccionados para este informe.</p>
      )}

      {testResults.map((tr) => (
        <section key={tr.testId} className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">{tr.test.name}</h3>
            <span className="text-xs text-gray-400 uppercase">{tr.test.type}</span>
          </div>

          {tr.test.scoreSlots.length === 0 ? (
            <p className="px-4 py-3 text-gray-400 text-sm">Sin slots definidos.</p>
          ) : (
            <div className="px-4 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {tr.test.scoreSlots.map((slot) => (
                <div key={slot.key}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {slot.name}
                    <span className="ml-1 text-gray-400 font-normal">({SCORE_TYPE_HINT[slot.scoreType] ?? slot.scoreType})</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    className="w-full border rounded-md px-3 py-1.5 text-sm"
                    value={scoresByTest[tr.testId]?.[slot.key] ?? ''}
                    onChange={(e) => updateScore(tr.testId, slot.key, e.target.value)}
                    placeholder="—"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="px-4 py-3 border-t bg-gray-50 flex items-center gap-3">
            <button
              onClick={() => handleSave(tr.testId)}
              disabled={savingTest === tr.testId}
              className="bg-blue-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {savingTest === tr.testId ? 'Guardando…' : 'Guardar puntajes'}
            </button>
            {savedTest === tr.testId && (
              <span className="text-xs text-green-600">Guardado</span>
            )}
            {tr.descriptor && (
              <span className="text-xs text-gray-500 ml-auto">
                Descriptor actual: <strong>{tr.descriptor}</strong>
              </span>
            )}
          </div>
        </section>
      ))}

      {/* PDF attachment */}
      <section className="border rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b">
          <h3 className="font-semibold text-gray-900 text-sm">Archivos adjuntos (PDFs de resultados)</h3>
        </div>
        <div className="px-4 py-4 space-y-3">
          {scorePdfs.length === 0 && (
            <p className="text-gray-400 text-sm">No hay PDFs adjuntos.</p>
          )}
          {scorePdfs.map((pdf) => (
            <div key={pdf.id} className="flex items-center justify-between text-sm border rounded-md px-3 py-2">
              <span className="text-gray-700 truncate max-w-xs">
                {pdf.rawExtractedData?.originalName ?? `PDF-${pdf.pdfHash.slice(0, 8)}`}
              </span>
              <button
                onClick={() => handleDeletePdf(pdf.id)}
                className="text-red-500 hover:text-red-700 text-xs ml-4 shrink-0"
              >
                Eliminar
              </button>
            </div>
          ))}

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePdfUpload(file);
                e.target.value = '';
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPdf}
              className="border border-dashed border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600 px-4 py-2 rounded-md text-sm w-full text-center disabled:opacity-50"
            >
              {uploadingPdf ? 'Subiendo…' : '+ Adjuntar PDF de resultados'}
            </button>
          </div>
        </div>
      </section>

      {/* Generate sections button */}
      <div className="flex items-center gap-4 py-2">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-emerald-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          {generating ? 'Generando secciones…' : 'Generar secciones cognitivas'}
        </button>
        {generateResult && (
          <span className="text-sm text-emerald-700">{generateResult}</span>
        )}
      </div>

      {/* Annex table preview */}
      <AnnexTablePreview tables={annexTables} />
    </div>
  );
}

function AnnexTablePreview({ tables }: { tables: AnnexTablesData }) {
  const hasData =
    tables.wechslerIndices.length > 0 ||
    tables.wechslerSubtests.length > 0 ||
    tables.battery.length > 0 ||
    tables.questionnaires.length > 0;

  if (!hasData) return null;

  return (
    <section className="border rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b">
        <h3 className="font-semibold text-gray-900 text-sm">Vista previa — Tablas de resultados (Anexo)</h3>
      </div>
      <div className="px-4 py-4 space-y-6">

        {tables.wechslerIndices.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Índices compuestos</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="border px-3 py-2 text-xs font-medium text-gray-700">Test</th>
                    <th className="border px-3 py-2 text-xs font-medium text-gray-700">Índice</th>
                    <th className="border px-3 py-2 text-xs font-medium text-gray-700 text-center">SS</th>
                    <th className="border px-3 py-2 text-xs font-medium text-gray-700 text-center">Pc</th>
                    <th className="border px-3 py-2 text-xs font-medium text-gray-700">Descriptor</th>
                  </tr>
                </thead>
                <tbody>
                  {tables.wechslerIndices.map((row, i) => (
                    <IndexRow key={i} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tables.wechslerSubtests.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Subtests</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="border px-3 py-2 text-xs font-medium text-gray-700">Test</th>
                    <th className="border px-3 py-2 text-xs font-medium text-gray-700">Subtest</th>
                    <th className="border px-3 py-2 text-xs font-medium text-gray-700 text-center">Escalar</th>
                    <th className="border px-3 py-2 text-xs font-medium text-gray-700">Descriptor</th>
                  </tr>
                </thead>
                <tbody>
                  {tables.wechslerSubtests.map((row, i) => (
                    <SubtestRow key={i} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tables.battery.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Batería neuropsicológica</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="border px-3 py-2 text-xs font-medium text-gray-700">Test</th>
                    <th className="border px-3 py-2 text-xs font-medium text-gray-700">Medida</th>
                    <th className="border px-3 py-2 text-xs font-medium text-gray-700 text-center">Puntaje</th>
                    <th className="border px-3 py-2 text-xs font-medium text-gray-700 text-center">Tipo</th>
                    <th className="border px-3 py-2 text-xs font-medium text-gray-700">Descriptor</th>
                  </tr>
                </thead>
                <tbody>
                  {tables.battery.map((row, i) => (
                    <BatteryRowComp key={i} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tables.questionnaires.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Cuestionarios</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="border px-3 py-2 text-xs font-medium text-gray-700">Cuestionario</th>
                    <th className="border px-3 py-2 text-xs font-medium text-gray-700">Escala</th>
                    <th className="border px-3 py-2 text-xs font-medium text-gray-700 text-center">Puntaje</th>
                    <th className="border px-3 py-2 text-xs font-medium text-gray-700">Clasificación</th>
                  </tr>
                </thead>
                <tbody>
                  {tables.questionnaires.map((row, i) => (
                    <QuestionnaireRowComp key={i} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function IndexRow({ row }: { row: WechslerIndexRow }) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="border px-3 py-2 text-gray-600 text-xs">{row.testCode}</td>
      <td className="border px-3 py-2">{row.slotName}</td>
      <td className="border px-3 py-2 text-center font-mono">{row.standardScore ?? '—'}</td>
      <td className="border px-3 py-2 text-center text-gray-500">{row.percentile != null ? `${row.percentile}` : '—'}</td>
      <td className="border px-3 py-2 text-gray-700">{row.descriptor ?? '—'}</td>
    </tr>
  );
}

function SubtestRow({ row }: { row: WechslerSubtestRow }) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="border px-3 py-2 text-gray-600 text-xs">{row.testCode}</td>
      <td className="border px-3 py-2">{row.slotName}</td>
      <td className="border px-3 py-2 text-center font-mono">{row.scaledScore ?? '—'}</td>
      <td className="border px-3 py-2 text-gray-700">{row.descriptor ?? '—'}</td>
    </tr>
  );
}

function BatteryRowComp({ row }: { row: BatteryRow }) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="border px-3 py-2 text-gray-600 text-xs">{row.testCode}</td>
      <td className="border px-3 py-2">{row.slotName}</td>
      <td className="border px-3 py-2 text-center font-mono">{row.score ?? '—'}</td>
      <td className="border px-3 py-2 text-center text-gray-500 text-xs">{row.scoreType}</td>
      <td className="border px-3 py-2 text-gray-700">{row.descriptor ?? '—'}</td>
    </tr>
  );
}

function QuestionnaireRowComp({ row }: { row: QuestionnaireRow }) {
  const classColor =
    row.classification === 'Clínicamente significativo' ? 'text-red-600 font-medium' :
    row.classification === 'Limítrofe' ? 'text-yellow-600 font-medium' : 'text-green-600';
  return (
    <tr className="hover:bg-gray-50">
      <td className="border px-3 py-2 text-gray-600 text-xs">{row.testCode}</td>
      <td className="border px-3 py-2">{row.slotName}</td>
      <td className="border px-3 py-2 text-center font-mono">{row.rawScore ?? '—'}</td>
      <td className={`border px-3 py-2 ${classColor}`}>{row.classification ?? '—'}</td>
    </tr>
  );
}
