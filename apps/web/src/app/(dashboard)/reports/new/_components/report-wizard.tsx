'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { StepFramework } from './step-framework';
import { StepTests } from './step-tests';
import { StepConfirm } from './step-confirm';

interface User { id: string; name: string }

export function ReportWizard({ patientId, supervisors }: { patientId: string; supervisors: User[] }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [framework, setFramework] = useState('SNP-CHC');
  const [tests, setTests] = useState<string[]>([]);
  const [supervisorId, setSupervisorId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function toggleTest(code: string) {
    setTests((prev) => prev.includes(code) ? prev.filter((t) => t !== code) : [...prev, code]);
  }

  async function handleCreate() {
    setLoading(true);
    setError('');
    try {
      const report = await apiClient.createReport({
        patientId,
        frameworkCode: framework,
        selectedTests: tests,
        supervisorId: supervisorId || undefined,
      });
      router.push(`/reports/${report.id}`);
    } catch (err: any) {
      setError(err.message ?? 'Error al crear el informe');
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl">
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`flex-1 h-1 rounded-full ${s <= step ? 'bg-brand-600' : 'bg-gray-200'}`}
          />
        ))}
      </div>

      {step === 1 && (
        <>
          <StepFramework selected={framework} onSelect={setFramework} />
          <button
            onClick={() => setStep(2)}
            className="mt-6 bg-brand-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-brand-700"
          >
            Siguiente
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <StepTests framework={framework} selected={tests} onToggle={toggleTest} />
          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(1)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
              Atrás
            </button>
            <button onClick={() => setStep(3)} className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-brand-700">
              Siguiente
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <StepConfirm
          framework={framework}
          tests={tests}
          supervisorId={supervisorId}
          onSupervisorChange={setSupervisorId}
          supervisors={supervisors}
          loading={loading}
          onConfirm={handleCreate}
          onBack={() => setStep(2)}
        />
      )}
    </div>
  );
}
