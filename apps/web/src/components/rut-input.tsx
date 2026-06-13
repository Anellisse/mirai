'use client';

import { formatRut, validateRut } from '@/lib/rut';

interface Props {
  name?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function RutInput({ name, value, onChange, className }: Props) {
  const { status, expectedDV } = validateRut(value);

  return (
    <div>
      <input
        name={name}
        type="text"
        value={value}
        onChange={(e) => onChange(formatRut(e.target.value))}
        placeholder="12.345.678-9"
        maxLength={12}
        className={className}
        autoComplete="off"
        spellCheck={false}
      />
      {status === 'valid' && (
        <p className="mt-0.5 text-xs text-green-600 font-medium">✓ RUT válido</p>
      )}
      {status === 'invalid' && (
        <p className="mt-0.5 text-xs text-red-600">
          ✗ Dígito verificador incorrecto — el correcto es <strong>{expectedDV}</strong>
        </p>
      )}
    </div>
  );
}
