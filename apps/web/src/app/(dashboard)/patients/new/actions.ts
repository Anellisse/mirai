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
  const rut = formData.get('rut') as string;
  const birthDate = formData.get('birthDate') as string;
  const gender = formData.get('gender') as string;
  const email = formData.get('email') as string;
  const phone = formData.get('phone') as string;
  if (rut) body.rut = rut;
  if (birthDate) body.birthDate = birthDate;
  if (gender) body.gender = gender;
  if (email) body.email = email;
  if (phone) body.phone = phone;

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
