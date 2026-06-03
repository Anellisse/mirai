'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AccessRequestItem } from '@/lib/api-client';
import { ReviewModal } from './review-modal';

interface Props {
  requests: AccessRequestItem[];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return 'hace menos de 1h';
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
}

export function AccessRequestsTable({ requests }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<'pending' | 'resolved'>('pending');
  const [selected, setSelected] = useState<AccessRequestItem | null>(null);

  const pending = requests.filter((r) => r.status === 'PENDING');
  const resolved = requests.filter((r) => r.status !== 'PENDING');
  const shown = tab === 'pending' ? pending : resolved;

  function handleUpdated() {
    setSelected(null);
    router.refresh();
  }

  return (
    <>
      {selected && (
        <ReviewModal
          request={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
        />
      )}

      <div className="flex gap-3 mb-4">
        <button
          onClick={() => setTab('pending')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
            tab === 'pending'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Pendientes ({pending.length})
        </button>
        <button
          onClick={() => setTab('resolved')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
            tab === 'resolved'
              ? 'bg-gray-200 text-gray-800'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Resueltas ({resolved.length})
        </button>
      </div>

      {shown.length === 0 ? (
        <p className="text-gray-500 text-sm">No hay solicitudes {tab === 'pending' ? 'pendientes' : 'resueltas'}.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Solicitante</th>
                <th className="px-4 py-3 text-left">Informe</th>
                <th className="px-4 py-3 text-left">Hace</th>
                {tab === 'resolved' && <th className="px-4 py-3 text-left">Estado</th>}
                <th className="px-4 py-3 text-left"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {shown.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.requester.name}</td>
                  <td className="px-4 py-3 text-gray-500 italic text-xs">
                    {r.report?.patient?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{timeAgo(r.createdAt)}</td>
                  {tab === 'resolved' && (
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        r.status === 'APPROVED'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {r.status === 'APPROVED' ? 'Aprobada' : 'Rechazada'}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    {r.status === 'PENDING' && (
                      <button
                        onClick={() => setSelected(r)}
                        className="text-brand-600 hover:text-brand-800 text-sm font-medium"
                      >
                        Revisar →
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
