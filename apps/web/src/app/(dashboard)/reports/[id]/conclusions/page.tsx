import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { ConclusionsForm } from './_components/conclusions-form';

export default async function ConclusionsPage({ params }: { params: { id: string } }) {
  let initial;
  try {
    initial = await apiClient.getConclusion(params.id);
  } catch {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/reports/${params.id}`} className="text-gray-500 hover:text-gray-700 text-sm">
          ← Volver al informe
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Conclusiones</h1>
      </div>
      <ConclusionsForm reportId={params.id} initial={initial} />
    </div>
  );
}
