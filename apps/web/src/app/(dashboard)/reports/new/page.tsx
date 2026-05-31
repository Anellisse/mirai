import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ReportWizard } from './_components/report-wizard';

export default async function NewReportPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string }>;
}) {
  const params = await searchParams;
  const patientId = params.patientId;
  if (!patientId) notFound();

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/patients/${patientId}`} className="text-gray-500 hover:text-gray-700 text-sm">
          ← Paciente
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nuevo informe</h1>
      </div>
      <ReportWizard patientId={patientId} supervisors={[]} />
    </div>
  );
}
