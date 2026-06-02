'use client';

import { useState } from 'react';
import {
  apiClient, SectionSummary, AnnexTablesData, CognitiveProfileDomain,
} from '@/lib/api-client';
import { WechslerBarChart } from '../../../_components/wechsler-bar-chart';
import { CognitiveRadarChart } from '../../../_components/cognitive-radar-chart';

interface Props {
  reportId: string;
  sectionType: string;
  initialSection: SectionSummary | null;
  isReadOnly: boolean;
  annexTables: AnnexTablesData | null;
  cognitiveProfile: CognitiveProfileDomain[];
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  AI_GENERATED: 'Generado por IA — pendiente de revisión',
  CLINICIAN_REVIEWING: 'En revisión',
  APPROVED: 'Aprobado',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-600',
  AI_GENERATED: 'bg-blue-50 text-blue-700 border border-blue-200',
  CLINICIAN_REVIEWING: 'bg-yellow-50 text-yellow-700',
  APPROVED: 'bg-green-50 text-green-700',
};

const GENERATED_BY_LABEL: Record<string, string> = {
  HUMAN: 'Redactado manualmente',
  AI: 'Generado por IA',
  RULES: 'Generado por el motor de reglas',
};

export function SectionEditor({
  reportId, sectionType, initialSection, isReadOnly, annexTables, cognitiveProfile,
}: Props) {
  const [section, setSection] = useState<SectionSummary | null>(initialSection);
  const [content, setContent] = useState(initialSection?.content ?? '');
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isApproved = section?.status === 'APPROVED';

  async function handleSave() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await apiClient.saveSection(reportId, sectionType, content);
      setSection((prev) => prev ? { ...prev, ...updated } : updated);
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
      const updated = await apiClient.approveSection(reportId, sectionType);
      setSection((prev) => prev ? { ...prev, ...updated, status: 'APPROVED' } : updated);
      setMessage('Sección aprobada.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al aprobar.');
    } finally {
      setApproving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Status row */}
      {section && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[section.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {STATUS_LABEL[section.status] ?? section.status}
          </span>
          {section.generatedBy && (
            <span className="text-xs text-gray-400">
              {GENERATED_BY_LABEL[section.generatedBy] ?? section.generatedBy}
            </span>
          )}
          {section.clinicianEdited && (
            <span className="text-xs text-gray-400">· Editado por el clínico</span>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-md">{error}</div>
      )}
      {message && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 rounded-md">{message}</div>
      )}

      {/* Content editor */}
      {!isReadOnly && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contenido de la sección {isApproved ? '(aprobado — solo lectura)' : ''}
          </label>
          <textarea
            rows={16}
            readOnly={isApproved}
            className={`w-full border rounded-md px-3 py-2 text-sm leading-relaxed font-mono ${
              isApproved ? 'bg-gray-50 text-gray-700 cursor-default' : 'focus:outline-none focus:ring-1 focus:ring-blue-400'
            }`}
            value={content}
            onChange={(e) => { setContent(e.target.value); setMessage(null); }}
            placeholder="Ingrese el contenido de esta sección…"
          />
        </div>
      )}

      {isReadOnly && (
        <div className="border rounded-md px-4 py-3 bg-gray-50">
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{content || '(Sin contenido)'}</p>
        </div>
      )}

      {/* Actions */}
      {!isReadOnly && !isApproved && (
        <div className="flex items-center gap-3 flex-wrap sticky bottom-0 bg-white py-3 border-t">
          <button
            onClick={handleSave}
            disabled={saving || content === section?.content}
            className="bg-gray-700 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-40"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button
            onClick={handleApprove}
            disabled={approving || !section || section.status === 'PENDING'}
            className="bg-emerald-600 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-emerald-700 disabled:opacity-40"
          >
            {approving ? 'Aprobando…' : 'Aprobar sección'}
          </button>
          <span className="text-xs text-gray-400">
            {section?.status === 'PENDING'
              ? 'Guarde el contenido antes de aprobar.'
              : 'Guarde los cambios antes de aprobar.'}
          </span>
        </div>
      )}

      {/* Charts for ANNEXES section */}
      {sectionType === 'ANNEXES' && (annexTables || cognitiveProfile.length > 0) && (
        <div className="mt-6 space-y-8">
          <div className="border-t pt-6">
            <h3 className="text-base font-semibold text-gray-900 mb-5">Gráficos de perfil</h3>

            {annexTables && annexTables.wechslerIndices.length > 0 && (
              <div className="mb-8">
                <WechslerBarChart
                  data={annexTables.wechslerIndices}
                  title="Índices compuestos Wechsler"
                />
              </div>
            )}

            {cognitiveProfile.length > 0 && (
              <div>
                <CognitiveRadarChart
                  data={cognitiveProfile}
                  title="Perfil cognitivo global por dominios"
                />
              </div>
            )}

            {(!annexTables?.wechslerIndices.length && !cognitiveProfile.length) && (
              <p className="text-gray-400 text-sm">
                Los gráficos aparecerán una vez se hayan ingresado puntajes y generado las secciones cognitivas.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
