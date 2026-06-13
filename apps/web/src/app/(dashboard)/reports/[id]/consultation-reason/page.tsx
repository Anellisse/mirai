import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { ConsultationReasonForm } from './_components/consultation-reason-form';

export default async function ConsultationReasonPage({ params }: { params: { id: string } }) {
  const reportId = params.id;

  let section = null;
  try {
    const report = await apiClient.getReport(reportId);
    section = report.sections.find(s => s.sectionType === 'CONSULTATION_REASON') ?? null;
  } catch {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/reports/${reportId}`} className="text-gray-500 hover:text-gray-700 text-sm">
          ← Volver al informe
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Motivo de consulta</h1>
      </div>
      <ConsultationReasonForm reportId={reportId} initialSection={section} />
    </div>
  );
}
