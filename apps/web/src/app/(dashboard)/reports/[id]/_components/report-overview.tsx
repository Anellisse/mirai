import { ReportDetail } from '@/lib/api-client';
import { SectionList } from './section-list';
import { TransitionButton } from './transition-button';

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

function getAvailableActions(status: string): ActionConfig[] {
  const map: Record<string, ActionConfig[]> = {
    DRAFT: [{ action: 'start', label: 'Iniciar redacción' }],
    IN_PROGRESS: [{ action: 'submit', label: 'Enviar a revisión' }],
    REVIEW: [
      { action: 'submit', label: 'Enviar a revisión supervisora' },
      { action: 'approve', label: 'Aprobar' },
    ],
    SUPERVISOR_REVIEW: [{ action: 'approve', label: 'Aprobar' }],
    APPROVED: [{ action: 'export', label: 'Exportar' }],
    EXPORTED: [{ action: 'finalize', label: 'Finalizar' }],
  };
  return map[status] ?? [];
}

export function ReportOverview({ report }: { report: ReportDetail }) {
  const actions = getAvailableActions(report.status);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className={`text-sm font-medium px-3 py-1 rounded-full ${STATUS_COLOR[report.status] ?? 'bg-gray-100'}`}>
          {STATUS_LABEL[report.status] ?? report.status}
        </span>
        <span className="text-sm text-gray-500">{report.frameworkCode}</span>
      </div>

      {actions.length > 0 && (
        <div className="flex gap-3 mb-6">
          {actions.map((a) => (
            <TransitionButton key={a.action} reportId={report.id} action={a.action} label={a.label} />
          ))}
        </div>
      )}

      <SectionList sections={report.sections} />
    </div>
  );
}
