import Link from 'next/link';
import { ReportDetail } from '@/lib/api-client';
import { SectionList } from './section-list';
import { TransitionButton } from './transition-button';
import { ExportButton } from './export-button';

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

interface ActionConfig { action: string; label: string }

function getTransitionActions(status: string): ActionConfig[] {
  const map: Record<string, ActionConfig[]> = {
    DRAFT: [{ action: 'start', label: 'Iniciar redacción' }],
    IN_PROGRESS: [{ action: 'submit', label: 'Enviar a revisión' }],
    REVIEW: [
      { action: 'submit', label: 'Enviar a revisión supervisora' },
      { action: 'approve', label: 'Aprobar' },
    ],
    SUPERVISOR_REVIEW: [{ action: 'approve', label: 'Aprobar' }],
  };
  return map[status] ?? [];
}

export function ReportOverview({ report }: { report: ReportDetail }) {
  const transitionActions = getTransitionActions(report.status);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className={`text-sm font-medium px-3 py-1 rounded-full ${STATUS_COLOR[report.status] ?? 'bg-gray-100'}`}>
          {STATUS_LABEL[report.status] ?? report.status}
        </span>
        <span className="text-sm text-gray-500">{report.frameworkCode}</span>
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {transitionActions.map((a) => (
          <TransitionButton key={a.action} reportId={report.id} action={a.action} label={a.label} />
        ))}
        {report.status === 'APPROVED' && (
          <ExportButton reportId={report.id} />
        )}
        {report.status === 'EXPORTED' && (
          <Link
            href={`/reports/${report.id}/finalize`}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700"
          >
            Finalizar informe
          </Link>
        )}
        <Link
          href={`/reports/${report.id}/evaluation`}
          className="border border-blue-300 text-blue-700 hover:bg-blue-50 px-4 py-1.5 rounded-md text-sm font-medium"
        >
          Ingreso de puntajes
        </Link>
      </div>

      <SectionList sections={report.sections} reportId={report.id} />
    </div>
  );
}
