'use client';

import { useState } from 'react';
import { apiClient, PatientListItem } from '@/lib/api-client';
import { PatientTable } from './patient-table';

interface Props {
  initialPatients: PatientListItem[];
  isAdmin: boolean;
}

export function PatientTableWrapper({ initialPatients, isAdmin }: Props) {
  const [patients, setPatients] = useState(initialPatients);
  const [loading, setLoading] = useState(false);

  async function handleSearch(params: { name?: string; rut?: string }) {
    setLoading(true);
    try {
      const results = await apiClient.getPatients(params);
      setPatients(results);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {loading && <p className="text-sm text-gray-500 mb-2">Buscando...</p>}
      <PatientTable patients={patients} isAdmin={isAdmin} onSearch={handleSearch} />
    </div>
  );
}
