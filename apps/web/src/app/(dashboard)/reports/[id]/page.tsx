import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { ReportOverview } from './_components/report-overview';

export default async function ReportDetailPage({ params }: { params: { id: string } }) {
  let report;
  try {
    report = await apiClient.getReport(params.id);
  } catch {
    notFound();
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={report.patient ? `/patients/${report.patient.id}` : '/repository'}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          ← {report.patient?.name ?? 'Repositorio'}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Informe</h1>
      </div>
      <ReportOverview report={report} />
    </div>
  );
}
