'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';

export function AccessRequestButton({ patientId }: { patientId: string }) {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.requestPatientAccess(patientId, reason);
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  if (sent) return <p className="text-green-600 text-sm">Solicitud enviada. Espera aprobación del administrador.</p>;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-sm">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motivo de la solicitud..."
        required
        className="border rounded-lg px-3 py-2 text-sm resize-none h-20"
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50"
      >
        {loading ? 'Enviando...' : 'Solicitar acceso'}
      </button>
    </form>
  );
}
