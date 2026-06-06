'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPatient } from '../actions';

export function PatientForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(e.currentTarget);

    const result = await createPatient(form);
    setLoading(false);

    if ('error' in result) {
      setError(result.error);
    } else {
      router.push(`/patients/${result.id}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
        <input name="name" required className="w-full border rounded-lg px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">RUT</label>
        <input name="rut" placeholder="12.345.678-9" className="w-full border rounded-lg px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento</label>
        <input name="birthDate" type="date" className="w-full border rounded-lg px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Género</label>
        <select name="gender" className="w-full border rounded-lg px-3 py-2 text-sm">
          <option value="">Sin especificar</option>
          <option value="M">Masculino</option>
          <option value="F">Femenino</option>
          <option value="NB">No binario</option>
          <option value="O">Otro</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input name="email" type="email" className="w-full border rounded-lg px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
        <input name="phone" className="w-full border rounded-lg px-3 py-2 text-sm" />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-brand-700 transition disabled:opacity-50"
      >
        {loading ? 'Guardando...' : 'Crear paciente'}
      </button>
    </form>
  );
}
