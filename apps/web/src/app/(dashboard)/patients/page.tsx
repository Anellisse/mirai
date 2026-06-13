import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { PatientTableWrapper } from './_components/patient-table-wrapper';

export default async function PatientsPage() {
  const [patients, me] = await Promise.all([
    apiClient.getPatients().catch(() => []),
    apiClient.getMe().catch(() => null),
  ]);
  const isAdmin = me?.role === 'ADMIN' || me?.role === 'SUPER_ADMIN';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pacientes</h1>
        <Link
          href="/patients/new"
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700 transition"
        >
          Nuevo paciente
        </Link>
      </div>
      <PatientTableWrapper initialPatients={patients} isAdmin={isAdmin} />
    </div>
  );
}
