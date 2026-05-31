interface Props {
  name: string;
  rut?: string;
  birthDate?: string;
  gender?: string;
  email?: string;
  phone?: string;
}

const GENDER_LABEL: Record<string, string> = { M: 'Masculino', F: 'Femenino', NB: 'No binario', O: 'Otro' };

export function PatientInfo({ name, rut, birthDate, gender, email, phone }: Props) {
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
            <dd>{new Date(birthDate).toLocaleDateString('es-CL')}</dd>
          </>
        )}
        {gender && (
          <>
            <dt className="text-gray-500">Género</dt>
            <dd>{GENDER_LABEL[gender] ?? gender}</dd>
          </>
        )}
        {email && (
          <>
            <dt className="text-gray-500">Email</dt>
            <dd>{email}</dd>
          </>
        )}
        {phone && (
          <>
            <dt className="text-gray-500">Teléfono</dt>
            <dd>{phone}</dd>
          </>
        )}
      </dl>
    </div>
  );
}
