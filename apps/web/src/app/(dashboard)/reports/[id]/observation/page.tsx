import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { ObservationChecklist } from './_components/observation-checklist';

export default async function ObservationPage({ params }: { params: { id: string } }) {
  let initial;
  try {
    const result = await apiClient.getObservation(params.id);
    initial = result?.data ?? {};
  } catch {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/reports/${params.id}`} className="text-gray-500 hover:text-gray-700 text-sm">
          ← Volver al informe
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Conducta observada</h1>
      </div>
      <ObservationChecklist reportId={params.id} initial={initial} />
    </div>
  );
}
