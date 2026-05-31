import Link from 'next/link';
import { PatientForm } from './_components/patient-form';

export default function NewPatientPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/patients" className="text-gray-500 hover:text-gray-700 text-sm">
          ← Pacientes
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nuevo paciente</h1>
      </div>
      <PatientForm />
    </div>
  );
}
