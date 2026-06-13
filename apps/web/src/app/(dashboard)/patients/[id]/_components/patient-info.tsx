'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, PatientDetail } from '@/lib/api-client';

const GENDER_LABEL: Record<string, string> = { M: 'Masculino', F: 'Femenino', NB: 'No binario', O: 'Otro' };

function toDateInput(iso?: string): string {
  if (!iso) return '';
  return iso.split('T')[0];
}

function calcAge(birthDateStr: string): string | null {
  const birth = new Date(birthDateStr + 'T12:00:00');
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months -= 1;
  if (months < 0) { years -= 1; months += 12; }
  if (years < 0) return null;
  const y = `${years} año${years !== 1 ? 's' : ''}`;
  const m = months > 0 ? ` y ${months} mes${months !== 1 ? 'es' : ''}` : '';
  return y + m;
}

const inputCls = 'w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400';
const labelCls = 'block text-xs font-medium text-gray-500 mb-0.5';

export function PatientInfo({ patient }: { patient: PatientDetail }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // form state
  const [name, setName] = useState(patient.name);
  const [rut, setRut] = useState(patient.rut ?? '');
  const [birthDate, setBirthDate] = useState(toDateInput(patient.birthDate));
  const [gender, setGender] = useState(patient.gender ?? '');
  const [laterality, setLaterality] = useState(patient.laterality ?? '');
  const [interviewDate, setInterviewDate] = useState(toDateInput(patient.interviewDate));
  const [schoolName, setSchoolName] = useState(patient.schoolName ?? '');
  const [schoolGrade, setSchoolGrade] = useState(patient.schoolGrade ?? '');
  const [currentInstitution, setCurrentInstitution] = useState(patient.currentInstitution ?? '');
  const [occupation, setOccupation] = useState(patient.occupation ?? '');

  const age = birthDate ? calcAge(birthDate) : null;
  const isMinor = age !== null && parseInt(age) < 18;
  // parse years from age string for minor check
  const ageYears = birthDate ? (() => {
    const birth = new Date(birthDate + 'T12:00:00');
    if (isNaN(birth.getTime())) return null;
    const now = new Date();
    let y = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) y -= 1;
    return y;
  })() : null;
  const minor = ageYears !== null && ageYears < 18;
  const adult = ageYears !== null && ageYears >= 18;

  function cancelEdit() {
    // reset to original values
    setName(patient.name);
    setRut(patient.rut ?? '');
    setBirthDate(toDateInput(patient.birthDate));
    setGender(patient.gender ?? '');
    setLaterality(patient.laterality ?? '');
    setInterviewDate(toDateInput(patient.interviewDate));
    setSchoolName(patient.schoolName ?? '');
    setSchoolGrade(patient.schoolGrade ?? '');
    setCurrentInstitution(patient.currentInstitution ?? '');
    setOccupation(patient.occupation ?? '');
    setError('');
    setEditing(false);
  }

  async function handleSave() {
    if (!name.trim()) { setError('El nombre es obligatorio.'); return; }
    setSaving(true);
    setError('');
    try {
      const data: Record<string, string> = { name: name.trim() };
      if (rut) data.rut = rut;
      if (birthDate) data.birthDate = birthDate;
      if (gender) data.gender = gender;
      if (laterality) data.laterality = laterality;
      if (interviewDate) data.interviewDate = interviewDate;
      if (schoolName) data.schoolName = schoolName;
      if (schoolGrade) data.schoolGrade = schoolGrade;
      if (currentInstitution) data.currentInstitution = currentInstitution;
      if (occupation) data.occupation = occupation;

      await apiClient.updatePatient(patient.id, data);
      setEditing(false);
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  }

  // ── Vista ──────────────────────────────────────────────────────────────────
  if (!editing) {
    const displayAge = patient.birthDate ? calcAge(toDateInput(patient.birthDate)) : null;
    return (
      <div className="bg-white border rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">{patient.name}</h2>
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-brand-600 hover:text-brand-700 border border-brand-200 hover:border-brand-400 px-3 py-1 rounded-md transition"
          >
            Editar
          </button>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {patient.rut && (<><dt className="text-gray-500">RUT</dt><dd>{patient.rut}</dd></>)}
          {patient.birthDate && (
            <>
              <dt className="text-gray-500">Fecha de nacimiento</dt>
              <dd>
                {new Date(patient.birthDate).toLocaleDateString('es-CL')}
                {displayAge && <span className="ml-2 text-brand-600 font-medium">({displayAge})</span>}
              </dd>
            </>
          )}
          {patient.gender && (<><dt className="text-gray-500">Género</dt><dd>{GENDER_LABEL[patient.gender] ?? patient.gender}</dd></>)}
          {patient.laterality && (<><dt className="text-gray-500">Lateralidad</dt><dd>{patient.laterality}</dd></>)}
          {patient.schoolName && (<><dt className="text-gray-500">Colegio</dt><dd>{patient.schoolName}</dd></>)}
          {patient.schoolGrade && (<><dt className="text-gray-500">Curso</dt><dd>{patient.schoolGrade}</dd></>)}
          {patient.currentInstitution && (<><dt className="text-gray-500">Institución actual</dt><dd>{patient.currentInstitution}</dd></>)}
          {patient.occupation && (<><dt className="text-gray-500">Profesión / Ocupación</dt><dd>{patient.occupation}</dd></>)}
          {patient.interviewDate && (<><dt className="text-gray-500">Fecha de entrevista</dt><dd>{new Date(patient.interviewDate).toLocaleDateString('es-CL')}</dd></>)}
        </dl>
      </div>
    );
  }

  // ── Edición inline ─────────────────────────────────────────────────────────
  return (
    <div className="bg-white border border-brand-200 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold text-lg text-gray-900">Editar datos del paciente</h2>
        <div className="flex gap-2">
          <button
            onClick={cancelEdit}
            disabled={saving}
            className="text-sm text-gray-600 hover:text-gray-800 border border-gray-200 px-3 py-1 rounded-md transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-sm bg-brand-600 text-white hover:bg-brand-700 px-4 py-1 rounded-md transition disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 px-3 py-2 rounded-md mb-4">{error}</p>}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className={labelCls}>Nombre completo *</label>
          <input value={name} onChange={e => setName(e.target.value)} className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>RUT</label>
          <input value={rut} onChange={e => setRut(e.target.value)} placeholder="12.345.678-9" className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>Fecha de nacimiento</label>
          <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className={inputCls} />
          {age && <p className="mt-0.5 text-xs font-medium text-brand-600">{age}</p>}
        </div>

        <div>
          <label className={labelCls}>Género</label>
          <select value={gender} onChange={e => setGender(e.target.value)} className={inputCls}>
            <option value="">Sin especificar</option>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
            <option value="NB">No binario</option>
            <option value="O">Otro</option>
          </select>
        </div>

        <div>
          <label className={labelCls}>Lateralidad</label>
          <select value={laterality} onChange={e => setLaterality(e.target.value)} className={inputCls}>
            <option value="">Sin especificar</option>
            <option value="Diestro">Diestro</option>
            <option value="Zurdo">Zurdo</option>
            <option value="Ambidiestro">Ambidiestro</option>
          </select>
        </div>

        {minor && (
          <>
            <div>
              <label className={labelCls}>Colegio</label>
              <input value={schoolName} onChange={e => setSchoolName(e.target.value)} className={inputCls} placeholder="Nombre del establecimiento" />
            </div>
            <div>
              <label className={labelCls}>Curso</label>
              <input value={schoolGrade} onChange={e => setSchoolGrade(e.target.value)} className={inputCls} placeholder="Ej: 3° básico" />
            </div>
          </>
        )}

        {adult && (
          <>
            <div>
              <label className={labelCls}>Institución actual</label>
              <input value={currentInstitution} onChange={e => setCurrentInstitution(e.target.value)} className={inputCls} placeholder="Universidad, empresa…" />
            </div>
            <div>
              <label className={labelCls}>Profesión / Ocupación</label>
              <input value={occupation} onChange={e => setOccupation(e.target.value)} className={inputCls} placeholder="Ej: Estudiante de Psicología" />
            </div>
          </>
        )}

        {!minor && !adult && (
          <>
            <div>
              <label className={labelCls}>Colegio</label>
              <input value={schoolName} onChange={e => setSchoolName(e.target.value)} className={inputCls} placeholder="Nombre del establecimiento" />
            </div>
            <div>
              <label className={labelCls}>Curso</label>
              <input value={schoolGrade} onChange={e => setSchoolGrade(e.target.value)} className={inputCls} placeholder="Ej: 3° básico" />
            </div>
            <div>
              <label className={labelCls}>Institución actual</label>
              <input value={currentInstitution} onChange={e => setCurrentInstitution(e.target.value)} className={inputCls} placeholder="Universidad, empresa…" />
            </div>
            <div>
              <label className={labelCls}>Profesión / Ocupación</label>
              <input value={occupation} onChange={e => setOccupation(e.target.value)} className={inputCls} placeholder="Ej: Estudiante de Psicología" />
            </div>
          </>
        )}

        <div>
          <label className={labelCls}>Fecha de entrevista</label>
          <input type="date" value={interviewDate} onChange={e => setInterviewDate(e.target.value)} className={inputCls} />
        </div>
      </div>
    </div>
  );
}
