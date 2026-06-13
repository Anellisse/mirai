interface Props {
  name: string;
  rut?: string;
  birthDate?: string;
  gender?: string;
  laterality?: string;
  interviewDate?: string;
  schoolName?: string;
  schoolGrade?: string;
  currentInstitution?: string;
  occupation?: string;
}

const GENDER_LABEL: Record<string, string> = { M: 'Masculino', F: 'Femenino', NB: 'No binario', O: 'Otro' };

function calcAge(birthDateStr: string): string | null {
  const birth = new Date(birthDateStr);
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

export function PatientInfo({
  name, rut, birthDate, gender, laterality, interviewDate,
  schoolName, schoolGrade, currentInstitution, occupation,
}: Props) {
  const age = birthDate ? calcAge(birthDate) : null;

  return (
    <div className="bg-white border rounded-lg p-6 mb-6">
      <h2 className="font-semibold text-lg mb-4">{name}</h2>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        {rut && (
          <>
            <dt className="text-gray-500">RUT</dt>
            <dd>{rut}</dd>
          </>
        )}
        {birthDate && (
          <>
            <dt className="text-gray-500">Fecha de nacimiento</dt>
            <dd>
              {new Date(birthDate).toLocaleDateString('es-CL')}
              {age && <span className="ml-2 text-brand-600 font-medium">({age})</span>}
            </dd>
          </>
        )}
        {gender && (
          <>
            <dt className="text-gray-500">Género</dt>
            <dd>{GENDER_LABEL[gender] ?? gender}</dd>
          </>
        )}
        {laterality && (
          <>
            <dt className="text-gray-500">Lateralidad</dt>
            <dd>{laterality}</dd>
          </>
        )}
        {schoolName && (
          <>
            <dt className="text-gray-500">Colegio</dt>
            <dd>{schoolName}</dd>
          </>
        )}
        {schoolGrade && (
          <>
            <dt className="text-gray-500">Curso</dt>
            <dd>{schoolGrade}</dd>
          </>
        )}
        {currentInstitution && (
          <>
            <dt className="text-gray-500">Institución actual</dt>
            <dd>{currentInstitution}</dd>
          </>
        )}
        {occupation && (
          <>
            <dt className="text-gray-500">Profesión / Ocupación</dt>
            <dd>{occupation}</dd>
          </>
        )}
        {interviewDate && (
          <>
            <dt className="text-gray-500">Fecha de entrevista</dt>
            <dd>{new Date(interviewDate).toLocaleDateString('es-CL')}</dd>
          </>
        )}
      </dl>
    </div>
  );
}
