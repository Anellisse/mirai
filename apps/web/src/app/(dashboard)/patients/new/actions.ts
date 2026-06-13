'use server';

import { auth } from '@/lib/auth';

const API_URL = process.env.API_URL ?? 'http://localhost:3001';

export async function createPatient(
  formData: FormData,
): Promise<{ error: string } | { id: string }> {
  const session = await auth();
  const token = (session as any)?.accessToken;
  if (!token) return { error: 'No autenticado' };

  const body: Record<string, string> = {
    name: formData.get('name') as string,
  };

  const fields = ['rut', 'birthDate', 'gender', 'laterality', 'interviewDate',
    'schoolName', 'schoolGrade', 'currentInstitution', 'occupation'] as const;
  for (const f of fields) {
    const val = formData.get(f) as string;
    if (val) body[f] = val;
  }

  const res = await fetch(`${API_URL}/api/patients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    return { error: (err as any).message ?? `Error ${res.status}` };
  }

  const patient = await res.json();
  return { id: patient.id };
}
