import Link from 'next/link';
import { ReportSummary } from '@/lib/api-client';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Borrador',
  IN_PROGRESS: 'En redacción',
  REVIEW: 'En revisión',
  SUPERVISOR_REVIEW: 'Revisión supervisora',
  APPROVED: 'Aprobado',
  EXPORTED: 'Exportado',
  FINAL: 'Final',
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  REVIEW: 'bg-yellow-100 text-yellow-700',
  SUPERVISOR_REVIEW: 'bg-orange-100 text-orange-700',
  APPROVED: 'bg-green-100 text-green-700',
  EXPORTED: 'bg-teal-100 text-teal-700',
  FINAL: 'bg-purple-100 text-purple-700',
};

export function ReportList({ reports, patientId }: { reports: ReportSummary[]; patientId: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Informes</h3>
        <Link
          href={`/reports/new?patientId=${patientId}`}
          className="bg-brand-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-brand-700 transition"
        >
          Nuevo informe
        </Link>
      </div>

      {reports.length === 0 ? (
        <p className="text-gray-500 text-sm">No hay informes para este paciente.</p>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <Link
              key={r.id}
              href={`/reports/${r.id}`}
              className="flex items-center justify-between border rounded-lg px-4 py-3 hover:bg-gray-50 transition"
            >
              <div className="text-sm">
                <span className="font-medium">{r.frameworkCode}</span>
                <span className="text-gray-500 ml-2">
                  {new Date(r.createdAt).toLocaleDateString('es-CL')}
                </span>
              </div>
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLOR[r.status] ?? 'bg-gray-100'}`}
              >
                {STATUS_LABEL[r.status] ?? r.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
