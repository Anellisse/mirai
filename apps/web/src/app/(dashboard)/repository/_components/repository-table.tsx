'use client';

import Link from 'next/link';
import { useState } from 'react';
import { RepositoryReportItem } from '@/lib/api-client';
import { AccessRequestRow } from './access-request-row';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Borrador', IN_PROGRESS: 'En redacción', REVIEW: 'En revisión',
  SUPERVISOR_REVIEW: 'Rev. supervisora', APPROVED: 'Aprobado',
  EXPORTED: 'Exportado', FINAL: 'Final',
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700', IN_PROGRESS: 'bg-blue-100 text-blue-700',
  REVIEW: 'bg-yellow-100 text-yellow-700', SUPERVISOR_REVIEW: 'bg-orange-100 text-orange-700',
  APPROVED: 'bg-green-100 text-green-700', EXPORTED: 'bg-teal-100 text-teal-700',
  FINAL: 'bg-purple-100 text-purple-700',
};

interface Props {
  reports: RepositoryReportItem[];
}

export function RepositoryTable({ reports }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  function handleSent(reportId: string) {
    setSentIds((prev) => new Set([...prev, reportId]));
    setExpandedId(null);
  }

  if (reports.length === 0) {
    return <p className="text-gray-500 text-sm mt-4">No hay informes en el repositorio.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
          <tr>
            <th className="px-4 py-3 text-left">Paciente</th>
            <th className="px-4 py-3 text-left">Profesional</th>
            <th className="px-4 py-3 text-left">Estado</th>
            <th className="px-4 py-3 text-left">Fecha</th>
            <th className="px-4 py-3 text-left">Acción</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {reports.map((r) => (
            <>
              <tr
                key={r.id}
                className={r.isOwn ? 'bg-green-50' : r.hasAccess ? 'bg-purple-50' : 'bg-white'}
              >
                <td className="px-4 py-3 font-medium text-gray-900">
                  {r.patientName}
                </td>
                <td className="px-4 py-3 text-gray-600">{r.author.name}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[r.status] ?? 'bg-gray-100'}`}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(r.createdAt).toLocaleDateString('es-CL')}
                </td>
                <td className="px-4 py-3">
                  {(r.isOwn || r.hasAccess) ? (
                    <Link
                      href={`/reports/${r.id}`}
                      className="text-brand-600 hover:text-brand-800 font-medium text-sm"
                    >
                      Abrir →
                    </Link>
                  ) : sentIds.has(r.id) || r.pendingRequest ? (
                    <span className="text-xs text-gray-400 italic">Solicitud enviada</span>
                  ) : (
                    <button
                      onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                      className="text-brand-600 hover:text-brand-800 text-sm font-medium"
                    >
                      🔒 Pedir
                    </button>
                  )}
                </td>
              </tr>
              {expandedId === r.id && (
                <AccessRequestRow
                  key={`form-${r.id}`}
                  reportId={r.id}
                  patientName={r.patientName}
                  onSent={() => handleSent(r.id)}
                />
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
