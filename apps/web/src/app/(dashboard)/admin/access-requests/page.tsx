import { redirect } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { AccessRequestsTable } from './_components/access-requests-table';

export default async function AccessRequestsPage() {
  const me = await apiClient.getMe().catch(() => null);
  if (!me || !['ADMIN', 'SUPER_ADMIN'].includes(me.role)) {
    redirect('/dashboard');
  }

  const requests = await apiClient.getAccessRequests().catch(() => []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Solicitudes de acceso</h1>
      <AccessRequestsTable requests={requests} />
    </div>
  );
}
