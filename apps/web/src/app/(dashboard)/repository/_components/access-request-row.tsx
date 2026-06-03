'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';

interface Props {
  reportId: string;
  patientName: string;
  onSent: () => void;
}

export function AccessRequestRow({ reportId, patientName, onSent }: Props) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await apiClient.createAccessRequest(reportId, reason);
      onSent();
    } catch (err: any) {
      setError(err.message ?? 'Error al enviar solicitud');
    } finally {
      setLoading(false);
    }
  }

  return (
    <tr>
      <td colSpan={5} className="px-4 py-3 bg-purple-50 border-b border-purple-100">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 max-w-lg">
          <p className="text-xs font-medium text-purple-800">
            Solicitar acceso — <span className="italic">{patientName}</span>
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo clínico de la solicitud (mínimo 10 caracteres)..."
            required
            minLength={10}
            rows={2}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || reason.length < 10}
              className="bg-brand-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar solicitud'}
            </button>
          </div>
        </form>
      </td>
    </tr>
  );
}
