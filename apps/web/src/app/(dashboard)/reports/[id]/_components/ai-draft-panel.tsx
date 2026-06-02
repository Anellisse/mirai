'use client';

import { useState } from 'react';
import { apiClient, AiDraftSection } from '@/lib/api-client';

interface Props {
  reportId: string;
  sectionType: 'BACKGROUND' | 'OBSERVED_BEHAVIOR';
  initialSection: AiDraftSection | null;
}

const SECTION_LABEL: Record<string, string> = {
  BACKGROUND: 'Antecedentes relevantes',
  OBSERVED_BEHAVIOR: 'Conducta observada',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  AI_GENERATED: 'Borrador generado por IA — requiere revisión clínica',
  CLINICIAN_REVIEWING: 'En revisión',
  APPROVED: 'Aprobado',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-600',
  AI_GENERATED: 'bg-blue-50 text-blue-700 border border-blue-200',
  CLINICIAN_REVIEWING: 'bg-yellow-50 text-yellow-700',
  APPROVED: 'bg-green-50 text-green-700',
};

export function AiDraftPanel({ reportId, sectionType, initialSection }: Props) {
  const [section, setSection] = useState<AiDraftSection | null>(initialSection);
  const [editedContent, setEditedContent] = useState(initialSection?.content ?? '');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setMessage(null);
    try {
      const result = sectionType === 'BACKGROUND'
        ? await apiClient.generateBackground(reportId)
        : await apiClient.generateObservation(reportId);
      setSection(result);
      setEditedContent(result.content ?? '');
      setMessage('Borrador generado. Revise el texto y guárdelo cuando esté conforme.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al generar el borrador.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await apiClient.saveSection(reportId, sectionType, editedContent);
      setSection((prev) => prev ? { ...prev, ...updated, status: updated.status as AiDraftSection['status'] } : prev);
      setMessage('Cambios guardados. La sección está en revisión.');
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
      const updated = await apiClient.approveSection(reportId, sectionType);
      setSection((prev) => prev ? { ...prev, ...updated, status: 'APPROVED' } : prev);
      setMessage('Sección aprobada.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al aprobar.');
    } finally {
      setApproving(false);
    }
  }

  const isApproved = section?.status === 'APPROVED';
  const hasDraft = section && section.content;
  const label = SECTION_LABEL[sectionType] ?? sectionType;

  return (
    <div className="mt-8 border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-white px-4 py-3 border-b flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-900">Borrador IA — {label}</span>
          {section && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[section.status]}`}>
              {STATUS_LABEL[section.status]}
            </span>
          )}
        </div>
        {!isApproved && (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-blue-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 shrink-0"
          >
            {generating ? 'Generando…' : hasDraft ? 'Regenerar borrador' : 'Generar borrador IA'}
          </button>
        )}
      </div>

      <div className="px-4 py-4 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-md">{error}</div>
        )}
        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 rounded-md">{message}</div>
        )}

        {!hasDraft && !generating && (
          <p className="text-gray-400 text-sm">
            Complete el formulario y presione "Generar borrador IA" para obtener un borrador redactado por el asistente.
            Recuerde revisar y editar el texto antes de aprobarlo.
          </p>
        )}

        {hasDraft && (
          <>
            {/* AI disclaimer */}
            {section?.status === 'AI_GENERATED' && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-md">
                Este texto fue generado por IA a partir del formulario completado.
                Revíselo cuidadosamente, edítelo según su criterio clínico y apruébelo cuando esté conforme.
                <strong> La IA no interpreta resultados cognitivos ni genera diagnósticos.</strong>
              </div>
            )}

            {/* Editable textarea */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Texto de la sección {isApproved ? '(aprobado — solo lectura)' : '(editable)'}
              </label>
              <textarea
                rows={12}
                readOnly={isApproved}
                className={`w-full border rounded-md px-3 py-2 text-sm leading-relaxed ${
                  isApproved ? 'bg-gray-50 text-gray-700 cursor-default' : 'focus:outline-none focus:ring-1 focus:ring-blue-400'
                }`}
                value={editedContent}
                onChange={(e) => {
                  setEditedContent(e.target.value);
                  setMessage(null);
                }}
              />
            </div>

            {/* Actions */}
            {!isApproved && (
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={handleSave}
                  disabled={saving || editedContent === section.content}
                  className="bg-gray-700 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-40"
                >
                  {saving ? 'Guardando…' : 'Guardar cambios'}
                </button>
                <button
                  onClick={handleApprove}
                  disabled={approving || section.status === 'PENDING'}
                  className="bg-emerald-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-emerald-700 disabled:opacity-40"
                >
                  {approving ? 'Aprobando…' : 'Aprobar sección'}
                </button>
                <span className="text-xs text-gray-400">
                  Guarde primero si editó el texto, luego apruebe.
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
