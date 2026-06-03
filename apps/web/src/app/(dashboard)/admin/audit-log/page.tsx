import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

const ACTION_LABEL: Record<string, string> = {
  ACCESS_REQUESTED: 'Acceso solicitado',
  ACCESS_GRANTED: 'Acceso concedido',
  ACCESS_REJECTED: 'Acceso rechazado',
  REPORT_FINALIZED: 'Informe finalizado',
};

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const me = await apiClient.getMe().catch(() => null);
  if (!me || !['ADMIN', 'SUPER_ADMIN'].includes(me.role)) {
    redirect('/dashboard');
  }

  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10));
  const { data, total } = await apiClient
    .getAuditLogs(page)
    .catch(() => ({ data: [], total: 0, page: 1 }));

  const totalPages = Math.ceil(total / 50);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Log de auditoría</h1>

      {data.length === 0 ? (
        <p className="text-gray-500 text-sm">No hay registros de auditoría.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Usuario</th>
                <th className="px-4 py-3 text-left">Acción</th>
                <th className="px-4 py-3 text-left">Recurso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('es-CL')}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {log.user?.name ?? <span className="text-gray-400 italic">Sistema</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-gray-800">
                      {ACTION_LABEL[log.action] ?? log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {log.resource}
                    {log.resourceId && ` · ${log.resourceId.slice(0, 8)}…`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center gap-4 mt-4 text-sm text-gray-600">
          {page > 1 && (
            <Link href={`?page=${page - 1}`} className="text-brand-600 hover:text-brand-800">
              ← Anterior
            </Link>
          )}
          <span>Página {page} de {totalPages}</span>
          {page < totalPages && (
            <Link href={`?page=${page + 1}`} className="text-brand-600 hover:text-brand-800">
              Siguiente →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
