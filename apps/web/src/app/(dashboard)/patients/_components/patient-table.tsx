'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PatientListItem } from '@/lib/api-client';

interface Props {
  patients: PatientListItem[];
  isAdmin: boolean;
  onSearch: (params: { name?: string; rut?: string }) => void;
}

function ageAtInterview(birthDate: string, interviewDate: string): string {
  const birth = new Date(birthDate + 'T12:00:00');
  const interview = new Date(interviewDate + 'T12:00:00');
  let years = interview.getFullYear() - birth.getFullYear();
  let months = interview.getMonth() - birth.getMonth();
  if (interview.getDate() < birth.getDate()) months -= 1;
  if (months < 0) { years -= 1; months += 12; }
  if (years < 0) return '—';
  return months > 0 ? `${years} a. ${months} m.` : `${years} años`;
}

export function PatientTable({ patients, isAdmin, onSearch }: Props) {
  const [nameQuery, setNameQuery] = useState('');
  const [rutQuery, setRutQuery] = useState('');

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    onSearch({
      name: nameQuery || undefined,
      rut: rutQuery || undefined,
    });
  }

  const colSpan = isAdmin ? 9 : 8;

  return (
    <div>
      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={nameQuery}
          onChange={(e) => setNameQuery(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <input
          type="text"
          placeholder="RUT exacto (ej: 12.345.678-9)"
          value={rutQuery}
          onChange={(e) => setRutQuery(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          type="submit"
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700 transition"
        >
          Buscar
        </button>
      </form>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Nombre</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Ingreso</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Profesional</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Edad entrevista</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Informes</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Acceso</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Autorización datos</th>
              {isAdmin && (
                <th className="text-left px-4 py-3 font-medium text-gray-700">Dx final</th>
              )}
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {patients.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="px-4 py-8 text-center text-gray-500">
                  No se encontraron pacientes
                </td>
              </tr>
            )}
            {patients.map((p) => {
              const age = p.birthDate && p.interviewDate
                ? ageAtInterview(p.birthDate.split('T')[0], p.interviewDate.split('T')[0])
                : '—';

              return (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600 tabular-nums whitespace-nowrap">
                    {new Date(p.createdAt).toLocaleDateString('es-CL')}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.createdByName ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 tabular-nums">{age}</td>
                  <td className="px-4 py-3 text-gray-600">{p.reportCount}</td>
                  <td className="px-4 py-3">
                    {p.isAssigned ? (
                      <span className="text-green-700 text-xs font-medium">A cargo</span>
                    ) : (
                      <span className="text-gray-400 text-xs">Sin acceso</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {p.dataConsent === true && <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Sí</span>}
                    {p.dataConsent === false && <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">No</span>}
                    {p.dataConsent === null && <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate">
                      {p.finalDiagnosis
                        ? <span title={p.finalDiagnosis}>{p.finalDiagnosis}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                  )}
                  <td className="px-4 py-3 text-right">
                    {p.isAssigned ? (
                      <Link href={`/patients/${p.id}`} className="text-brand-600 hover:underline text-sm">
                        Ver
                      </Link>
                    ) : (
                      <Link href={`/patients/${p.id}`} className="text-gray-400 hover:text-brand-600 text-sm">
                        Solicitar acceso
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
