import { apiClient } from '@/lib/api-client';
import { RepositoryTable } from './_components/repository-table';

export default async function RepositoryPage() {
  const reports = await apiClient.getRepositoryReports().catch(() => []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Repositorio</h1>
        <p className="text-sm text-gray-500 mt-1">
          Todos los informes de la organización. Los ajenos requieren solicitar acceso.
        </p>
      </div>
      <RepositoryTable reports={reports} />
    </div>
  );
}
