'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPatient } from '../actions';

function calcAge(birthDateStr: string): { years: number; months: number } | null {
  if (!birthDateStr) return null;
  const birth = new Date(birthDateStr + 'T12:00:00');
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months -= 1;
  if (months < 0) { years -= 1; months += 12; }
  if (years < 0) return null;
  return { years, months };
}

function ageLabel(age: { years: number; months: number }): string {
  const y = `${age.years} año${age.years !== 1 ? 's' : ''}`;
  const m = age.months > 0 ? ` y ${age.months} mes${age.months !== 1 ? 'es' : ''}` : '';
  return y + m;
}

const inputCls = 'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

export function PatientForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [birthDate, setBirthDate] = useState('');

  const age = calcAge(birthDate);
  const isMinor = age !== null && age.years < 18;
  const isAdult = age !== null && age.years >= 18;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await createPatient(new FormData(e.currentTarget));
    setLoading(false);
    if ('error' in result) {
      setError(result.error);
    } else {
      router.push(`/patients/${result.id}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 px-3 py-2 rounded-md">{error}</p>}

      {/* Nombre */}
      <div>
        <label className={labelCls}>Nombre completo *</label>
        <input name="name" required className={inputCls} placeholder="Ej: María González Pérez" />
      </div>

      {/* RUT */}
      <div>
        <label className={labelCls}>RUT</label>
        <input name="rut" className={inputCls} placeholder="12.345.678-9" />
      </div>

      {/* Fecha de nacimiento + edad calculada */}
      <div>
        <label className={labelCls}>Fecha de nacimiento</label>
        <input
          name="birthDate"
          type="date"
          className={inputCls}
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
        />
        {age !== null && (
          <p className="mt-1 text-sm font-medium text-brand-600">
            {ageLabel(age)}
          </p>
        )}
      </div>

      {/* Género */}
      <div>
        <label className={labelCls}>Género</label>
        <select name="gender" className={inputCls}>
          <option value="">Sin especificar</option>
          <option value="M">Masculino</option>
          <option value="F">Femenino</option>
          <option value="NB">No binario</option>
          <option value="O">Otro</option>
        </select>
      </div>

      {/* Lateralidad */}
      <div>
        <label className={labelCls}>Lateralidad</label>
        <select name="laterality" className={inputCls}>
          <option value="">Sin especificar</option>
          <option value="Diestro">Diestro</option>
          <option value="Zurdo">Zurdo</option>
          <option value="Ambidiestro">Ambidiestro</option>
        </select>
      </div>

      {/* Campos condicionales para menores */}
      {(isMinor || birthDate === '') && (
        <div className={`space-y-4 transition-all ${!isMinor && birthDate !== '' ? 'hidden' : ''}`}>
          {isMinor && (
            <>
              <div>
                <label className={labelCls}>Colegio</label>
                <input name="schoolName" className={inputCls} placeholder="Nombre del establecimiento educacional" />
              </div>
              <div>
                <label className={labelCls}>Curso</label>
                <input name="schoolGrade" className={inputCls} placeholder="Ej: 3° básico, 1° medio" />
              </div>
            </>
          )}
        </div>
      )}

      {/* Campos condicionales para adultos */}
      {isAdult && (
        <>
          <div>
            <label className={labelCls}>Institución actual</label>
            <input name="currentInstitution" className={inputCls} placeholder="Universidad, empresa u otra institución" />
          </div>
          <div>
            <label className={labelCls}>Profesión u ocupación actual</label>
            <input name="occupation" className={inputCls} placeholder="Ej: Estudiante de Psicología, Ingeniero Civil" />
          </div>
        </>
      )}

      {/* Fecha de entrevista */}
      <div>
        <label className={labelCls}>Fecha de entrevista</label>
        <input name="interviewDate" type="date" className={inputCls} />
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
