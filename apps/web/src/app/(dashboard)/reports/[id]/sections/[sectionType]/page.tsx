import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiClient, AnnexTablesData, CognitiveProfileDomain, SectionSummary } from '@/lib/api-client';
import { SectionEditor } from './_components/section-editor';

const SECTION_LABEL: Record<string, string> = {
  IDENTIFICATION: 'Datos de identificación',
  CONSULTATION_REASON: 'Motivo de consulta',
  BACKGROUND: 'Antecedentes relevantes',
  PROCEDURE_TESTS: 'Procedimiento y pruebas aplicadas',
  OBSERVED_BEHAVIOR: 'Conducta observada',
  QUESTIONNAIRE_SYMPTOMS: 'Sintomatología en cuestionarios',
  COGNITIVE_EVALUATION: 'Evaluación cognitiva',
  SOCIAL_COGNITION: 'Cognición social',
  RESULTS_SYNTHESIS: 'Síntesis de resultados',
  CONCLUSIONS: 'Conclusiones',
  RECOMMENDATIONS: 'Recomendaciones',
  ANNEXES: 'Anexos',
};

const READ_ONLY_SECTIONS = new Set(['IDENTIFICATION']);

export default async function SectionEditorPage({
  params,
}: {
  params: { id: string; sectionType: string };
}) {
  const { id: reportId, sectionType } = params;
  const label = SECTION_LABEL[sectionType] ?? sectionType;
  const isReadOnly = READ_ONLY_SECTIONS.has(sectionType);

  let section: SectionSummary | null = null;
  let annexTables: AnnexTablesData | null = null;
  let cognitiveProfile: CognitiveProfileDomain[] = [];

  try {
    const report = await apiClient.getReport(reportId);
    section = report.sections.find((s) => s.sectionType === sectionType) ?? null;

    if (sectionType === 'ANNEXES') {
      [annexTables, cognitiveProfile] = await Promise.all([
        apiClient.getAnnexTables(reportId),
        apiClient.getCognitiveProfile(reportId),
      ]);
    }
  } catch {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/reports/${reportId}`} className="text-gray-500 hover:text-gray-700 text-sm">
          ← Volver al informe
        </Link>
        <h1 className="text-xl font-bold text-gray-900">{label}</h1>
      </div>

      <SectionEditor
        reportId={reportId}
        sectionType={sectionType}
        initialSection={section}
        isReadOnly={isReadOnly}
        annexTables={annexTables}
        cognitiveProfile={cognitiveProfile}
      />
    </div>
  );
}
