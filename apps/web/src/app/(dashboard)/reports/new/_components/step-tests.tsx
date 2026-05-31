'use client';

interface TestOption {
  code: string;
  name: string;
  domain?: string;
}

interface Props {
  framework: string;
  selected: string[];
  onToggle: (code: string) => void;
}

const TESTS_BY_FRAMEWORK: Record<string, TestOption[]> = {
  'SNP-CHC': [
    { code: 'WISC-V', name: 'WISC-V', domain: 'Inteligencia' },
    { code: 'TFCRO', name: 'TFCRO', domain: 'Visuoespacial' },
    { code: 'TAVECI', name: 'TAVECI', domain: 'Memoria episódica verbal' },
    { code: 'WCST', name: 'WCST', domain: 'Funciones ejecutivas' },
    { code: 'TMT', name: 'TMT', domain: 'Funciones ejecutivas' },
    { code: 'CARAS-R', name: 'CARAS-R', domain: 'Atención' },
    { code: 'ADOS-2', name: 'ADOS-2', domain: 'Cognición social' },
    { code: 'ADI-R', name: 'ADI-R', domain: 'Cognición social' },
    { code: 'BASC-3', name: 'BASC-3', domain: 'Cuestionarios' },
  ],
  STANDARD: [
    { code: 'WAIS-IV', name: 'WAIS-IV', domain: 'Inteligencia' },
    { code: 'TFCRO', name: 'TFCRO', domain: 'Visuoespacial' },
    { code: 'TAVEC', name: 'TAVEC', domain: 'Memoria' },
    { code: 'WCST', name: 'WCST', domain: 'Funciones ejecutivas' },
    { code: 'TMT', name: 'TMT', domain: 'Funciones ejecutivas' },
    { code: 'CARAS-R', name: 'CARAS-R', domain: 'Atención' },
    { code: 'ASRS-18', name: 'ASRS-18', domain: 'Cuestionarios' },
    { code: 'DEX-Sp', name: 'DEX-Sp', domain: 'Cuestionarios' },
    { code: 'BAI', name: 'BAI', domain: 'Cuestionarios' },
    { code: 'BDI-II', name: 'BDI-II', domain: 'Cuestionarios' },
  ],
};

export function StepTests({ framework, selected, onToggle }: Props) {
  const tests = TESTS_BY_FRAMEWORK[framework] ?? [];
  const byDomain = tests.reduce<Record<string, TestOption[]>>((acc, t) => {
    const d = t.domain ?? 'Otros';
    return { ...acc, [d]: [...(acc[d] ?? []), t] };
  }, {});

  return (
    <div>
      <h2 className="font-semibold text-gray-900 mb-4">Paso 2: Selecciona los tests aplicados</h2>
      {Object.entries(byDomain).map(([domain, items]) => (
        <div key={domain} className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{domain}</p>
          <div className="space-y-1">
            {items.map((t) => (
              <label key={t.code} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(t.code)}
                  onChange={() => onToggle(t.code)}
                  className="rounded border-gray-300 text-brand-600"
                />
                <span className="text-sm">{t.name}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
