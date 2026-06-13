import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { PatientInfo } from './_components/patient-info';
import { ReportList } from './_components/report-list';
import { AccessRequestButton } from './_components/access-request-button';

export default async function PatientDetailPage({ params }: { params: { id: string } }) {
  let patient;
  let forbidden = false;

  try {
    patient = await apiClient.getPatient(params.id);
  } catch (err: any) {
    if (err.message?.includes('Sin acceso')) {
      forbidden = true;
    } else {
      notFound();
    }
  }

  if (forbidden) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-gray-600">No tienes acceso a este paciente.</p>
        <AccessRequestButton patientId={params.id} />
      </div>
    );
  }

  if (!patient) notFound();

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/patients" className="text-gray-500 hover:text-gray-700 text-sm">
          ← Pacientes
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{patient.name}</h1>
      </div>
      <PatientInfo patient={patient} />
      <ReportList reports={patient.reports} patientId={patient.id} />
    </div>
  );
}
