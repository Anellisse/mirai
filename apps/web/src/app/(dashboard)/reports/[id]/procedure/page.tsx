import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { ProcedureForm } from './_components/procedure-form';

export default async function ProcedurePage({ params }: { params: { id: string } }) {
  let initial;
  try {
    initial = await apiClient.getProcedure(params.id);
  } catch {
    notFound();
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/reports/${params.id}`} className="text-gray-500 hover:text-gray-700 text-sm">
          ← Volver al informe
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Procedimiento y pruebas aplicadas</h1>
      </div>
      <ProcedureForm reportId={params.id} initial={initial} />
    </div>
  );
}
