'use client';

interface Props {
  selected: string;
  onSelect: (code: string) => void;
}

const FRAMEWORKS = [
  {
    code: 'SNP-CHC',
    name: 'SNP-CHC (Infanto-Juvenil)',
    description: 'Neurodesarrollo, hasta ~30 años. Organizado en 4 ejes jerárquicos.',
  },
  {
    code: 'STANDARD',
    name: 'Estándar por funciones (Adultos)',
    description: 'Lesión, neurocognitivo, psiquiátrico. Funciones planas.',
  },
];

export function StepFramework({ selected, onSelect }: Props) {
  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-gray-900 mb-4">Paso 1: Selecciona el marco clínico</h2>
      {FRAMEWORKS.map((f) => (
        <button
          key={f.code}
          type="button"
          onClick={() => onSelect(f.code)}
          className={`w-full text-left border rounded-lg p-4 transition ${
            selected === f.code ? 'border-brand-600 bg-brand-50' : 'hover:bg-gray-50'
          }`}
        >
          <p className="font-medium text-sm">{f.name}</p>
          <p className="text-xs text-gray-500 mt-1">{f.description}</p>
        </button>
      ))}
    </div>
  );
}
