import Link from 'next/link';
import { SectionSummary } from '@/lib/api-client';

const SECTION_LABEL: Record<string, string> = {
  IDENTIFICATION: 'Datos de identificación',
  CONSULTATION_REASON: 'Motivo de consulta',
  BACKGROUND: 'Antecedentes relevantes',
  PROCEDURE_TESTS: 'Procedimiento y pruebas',
  OBSERVED_BEHAVIOR: 'Conducta observada',
  QUESTIONNAIRE_SYMPTOMS: 'Sintomatología en cuestionarios',
  COGNITIVE_EVALUATION: 'Evaluación cognitiva',
  SOCIAL_COGNITION: 'Cognición social',
  RESULTS_SYNTHESIS: 'Síntesis de resultados',
  CONCLUSIONS: 'Conclusiones',
  RECOMMENDATIONS: 'Recomendaciones',
  ANNEXES: 'Anexos',
};

const SECTION_ROUTE: Record<string, string> = {
  BACKGROUND: 'interview',
  OBSERVED_BEHAVIOR: 'observation',
  CONCLUSIONS: 'conclusions',
  CONSULTATION_REASON: 'consultation-reason',
  PROCEDURE_TESTS: 'procedure',
  COGNITIVE_EVALUATION: 'sections/COGNITIVE_EVALUATION',
  QUESTIONNAIRE_SYMPTOMS: 'sections/QUESTIONNAIRE_SYMPTOMS',
  SOCIAL_COGNITION: 'sections/SOCIAL_COGNITION',
  RESULTS_SYNTHESIS: 'sections/RESULTS_SYNTHESIS',
  RECOMMENDATIONS: 'sections/RECOMMENDATIONS',
  ANNEXES: 'sections/ANNEXES',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-600',
  AI_GENERATED: 'bg-blue-100 text-blue-700',
  CLINICIAN_REVIEWING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  AI_GENERATED: 'Generado por IA',
  CLINICIAN_REVIEWING: 'En revisión',
  APPROVED: 'Aprobado',
};

export function SectionList({ sections, reportId }: { sections: SectionSummary[]; reportId: string }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-700">Sección</th>
            <th className="text-left px-4 py-3 font-medium text-gray-700">Estado</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {sections.map((s) => {
            const route = SECTION_ROUTE[s.sectionType];
            return (
              <tr key={s.sectionType} className="hover:bg-gray-50">
                <td className="px-4 py-3">{SECTION_LABEL[s.sectionType] ?? s.sectionType}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLOR[s.status] ?? 'bg-gray-100'}`}>
                    {STATUS_LABEL[s.status] ?? s.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {route ? (
                    <Link href={`/reports/${reportId}/${route}`} className="text-blue-600 hover:underline text-xs">
                      Editar
                    </Link>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
