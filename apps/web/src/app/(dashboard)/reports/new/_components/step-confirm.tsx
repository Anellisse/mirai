'use client';

interface User {
  id: string;
  name: string;
}

interface Props {
  framework: string;
  tests: string[];
  supervisorId: string;
  onSupervisorChange: (id: string) => void;
  supervisors: User[];
  loading: boolean;
  onConfirm: () => void;
  onBack: () => void;
}

export function StepConfirm({
  framework, tests, supervisorId, onSupervisorChange, supervisors, loading, onConfirm, onBack,
}: Props) {
  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-gray-900 mb-4">Paso 3: Confirmar y crear</h2>

      <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
        <p><span className="font-medium">Marco:</span> {framework}</p>
        <p><span className="font-medium">Tests:</span> {tests.length === 0 ? 'Ninguno' : tests.join(', ')}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Supervisor (opcional)
        </label>
        <select
          value={supervisorId}
          onChange={(e) => onSupervisorChange(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Sin supervisor</option>
          {supervisors.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onBack} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
          Atrás
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? 'Creando...' : 'Crear informe'}
        </button>
      </div>
    </div>
  );
}
