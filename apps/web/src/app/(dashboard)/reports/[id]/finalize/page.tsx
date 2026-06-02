import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { FinalizeForm } from './_components/finalize-form';

const ALLOWED_STATUSES = ['APPROVED', 'EXPORTED'];

export default async function FinalizePage({ params }: { params: { id: string } }) {
  let report;
  try {
    report = await apiClient.getReport(params.id);
  } catch {
    notFound();
  }

  if (!ALLOWED_STATUSES.includes(report.status)) {
    redirect(`/reports/${params.id}`);
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link
          href={`/reports/${params.id}`}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          ← Volver al informe
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Sellar versión final</h1>
        {report.patient && (
          <p className="text-sm text-gray-500 mt-1">{report.patient.name}</p>
        )}
      </div>
      <FinalizeForm reportId={params.id} />
    </div>
  );
}
