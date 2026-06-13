/**
 * Formatea un string cualquiera como RUT chileno: XX.XXX.XXX-X
 * Acepta input con o sin puntos/guión, y maneja paste de formatos distintos.
 */
export function formatRut(raw: string): string {
  const upper = raw.toUpperCase();
  const hyphenIdx = upper.lastIndexOf('-');

  if (hyphenIdx >= 0) {
    // El usuario ya escribió o hay un guión: separamos cuerpo y DV
    const body = upper.slice(0, hyphenIdx).replace(/[^0-9]/g, '');
    const dv = upper.slice(hyphenIdx + 1).replace(/[^0-9K]/g, '').slice(0, 1);
    if (!body) return '';
    const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return dv ? `${formatted}-${dv}` : `${formatted}-`;
  }

  // Sin guión: limpiar a dígitos+K
  const clean = upper.replace(/[^0-9K]/g, '');
  if (clean.length === 0) return '';

  // Con ≥ 8 chars (cuerpo mínimo 7 + 1 DV) inferimos que el último es el DV
  if (clean.length >= 8) {
    const dv = clean.slice(-1);
    const body = clean.slice(0, -1);
    return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
  }

  // Aún incompleto: solo agregar puntos al cuerpo
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function calcDV(cleanBody: string): string {
  let sum = 0;
  let factor = 2;
  for (let i = cleanBody.length - 1; i >= 0; i--) {
    sum += parseInt(cleanBody[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const dv = 11 - (sum % 11);
  if (dv === 11) return '0';
  if (dv === 10) return 'K';
  return String(dv);
}

export type RutStatus = 'valid' | 'invalid' | 'incomplete';

export interface RutValidation {
  status: RutStatus;
  expectedDV?: string;
}

export function validateRut(formatted: string): RutValidation {
  const parts = formatted.split('-');
  if (parts.length !== 2) return { status: 'incomplete' };
  const [body, dv] = parts;
  const cleanBody = body.replace(/\./g, '');
  if (cleanBody.length < 7 || !dv) return { status: 'incomplete' };
  const expected = calcDV(cleanBody);
  if (dv.toUpperCase() === expected) return { status: 'valid' };
  return { status: 'invalid', expectedDV: expected };
}
