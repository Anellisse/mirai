'use client';

import { useRef, useState } from 'react';
import { apiClient, FinalReportData } from '@/lib/api-client';

type Source = 'SYSTEM_PDF' | 'UPLOADED';
type Phase = 'selecting' | 'loading' | 'success';

export function FinalizeForm({ reportId }: { reportId: string }) {
  const [phase, setPhase] = useState<Phase>('selecting');
  const [source, setSource] = useState<Source | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState<FinalReportData | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const canSubmit =
    source !== null &&
    confirmed &&
    (source === 'SYSTEM_PDF' || file !== null);

  async function handleSubmit() {
    if (!source) return;
    setPhase('loading');
    setError('');
    try {
      const data = await apiClient.finalizeReport(reportId, source, file ?? undefined);
      setResult(data);
      setPhase('success');
    } catch (err: any) {
      setError(err.message ?? 'Error al finalizar el informe');
      setPhase('selecting');
    }
  }

  if (phase === 'success' && result) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-green-800 mb-1">Informe sellado exitosamente</h2>
        <p className="text-sm text-green-700 mb-6">Estado: FINAL</p>
        <div className="bg-white border border-green-100 rounded-lg p-4 text-sm text-gray-700 text-left space-y-2 mb-6">
          <div>
            <span className="font-medium text-gray-900">Firma:</span>{' '}
            <span className="text-gray-600">{result.signature}</span>
          </div>
          <div>
            <span className="font-medium text-gray-900">Hash SHA-256:</span>{' '}
            <span className="font-mono text-xs text-gray-500">{result.fileHash.slice(0, 16)}...</span>
          </div>
          <div>
            <span className="font-medium text-gray-900">Versión:</span>{' '}
            <span className="text-gray-600">v{result.version}</span>
          </div>
        </div>
        <a
          href={`/reports/${reportId}`}
          className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-brand-700 inline-block"
        >
          ← Volver al informe
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setSource('SYSTEM_PDF')}
          className={`border-2 rounded-xl p-6 text-left transition-colors ${
            source === 'SYSTEM_PDF'
              ? 'border-brand-600 bg-brand-50'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
        >
          <div className="text-3xl mb-3">📄</div>
          <div className="font-semibold text-gray-900 mb-1">Opción A — Word del sistema</div>
          <p className="text-sm text-gray-500">
            Usa el documento .docx generado por Mirai como versión oficial sellada.
          </p>
        </button>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={`border-2 rounded-xl p-6 text-left transition-colors ${
            source === 'UPLOADED'
              ? 'border-brand-600 bg-brand-50'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
        >
          <div className="text-3xl mb-3">⬆️</div>
          <div className="font-semibold text-gray-900 mb-1">Opción B — Subir PDF editado</div>
          <p className="text-sm text-gray-500">
            Sube tu propio PDF (editado externamente) como versión oficial.
          </p>
          {file && (
            <p className="text-xs text-brand-600 mt-2 font-medium truncate">{file.name}</p>
          )}
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          setFile(f);
          if (f) setSource('UPLOADED');
        }}
      />

      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
        />
        <span className="text-sm text-gray-700">
          Confirmo que revisé el contenido completo del informe y autorizo su sellado como versión oficial.
        </span>
      </label>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit || phase === 'loading'}
        className="w-full bg-brand-600 text-white py-3 rounded-lg font-medium text-sm hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {phase === 'loading' ? 'Sellando informe...' : 'Sellar informe final'}
      </button>
    </div>
  );
}
