'use client';

import { useState } from 'react';
import { AccessRequestItem, apiClient } from '@/lib/api-client';

interface Props {
  request: AccessRequestItem;
  onClose: () => void;
  onUpdated: () => void;
}

export function ReviewModal({ request, onClose, onUpdated }: Props) {
  const [duration, setDuration] = useState<'permanent' | '24h' | '48h'>('permanent');
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleApprove() {
    setLoading(true);
    setError('');
    try {
      await apiClient.approveAccessRequest(request.id, duration);
      onUpdated();
    } catch (err: any) {
      setError(err.message ?? 'Error al aprobar');
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) { setError('El motivo de rechazo es obligatorio'); return; }
    setLoading(true);
    setError('');
    try {
      await apiClient.rejectAccessRequest(request.id, rejectReason);
      onUpdated();
    } catch (err: any) {
      setError(err.message ?? 'Error al rechazar');
    } finally {
      setLoading(false);
    }
  }

  const patientName = request.report?.patient?.name ?? '—';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Revisar solicitud de acceso</h2>
        <p className="text-sm text-gray-500 mb-4">
          <strong>{request.requester.name}</strong> solicita acceso a{' '}
          <em className="text-gray-700">{patientName}</em>
        </p>

        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 mb-4">
          <p className="text-xs text-gray-500 mb-1 font-medium">Motivo:</p>
          {request.reason}
        </div>

        {!showReject ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duración del acceso</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value as any)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                <option value="permanent">Permanente</option>
                <option value="24h">24 horas</option>
                <option value="48h">48 horas</option>
              </select>
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Procesando...' : '✓ Aprobar'}
              </button>
              <button
                onClick={() => setShowReject(true)}
                disabled={loading}
                className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50"
              >
                ✗ Rechazar
              </button>
            </div>
            <button onClick={onClose} className="w-full text-sm text-gray-500 hover:text-gray-700">
              Cancelar
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Motivo del rechazo</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Explica por qué se rechaza la solicitud..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
            />
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={handleReject}
                disabled={loading || !rejectReason.trim()}
                className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50"
              >
                {loading ? 'Rechazando...' : 'Confirmar rechazo'}
              </button>
              <button
                onClick={() => setShowReject(false)}
                className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                Volver
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
