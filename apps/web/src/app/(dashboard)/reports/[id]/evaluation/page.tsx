import Link from 'next/link';
import { apiClient, TestResultData, ScorePdfData, AnnexTablesData } from '@/lib/api-client';
import { EvaluationForm } from './_components/evaluation-form';

export default async function EvaluationPage({ params }: { params: { id: string } }) {
  const reportId = params.id;

  let report: { selectedTests: string[]; frameworkCode: string } | null = null;
  let testResults: TestResultData[] = [];
  let scorePdfs: ScorePdfData[] = [];
  let annexTables: AnnexTablesData = { wechslerIndices: [], wechslerSubtests: [], battery: [], questionnaires: [] };

  try {
    const [r, tr, pdfs, tables] = await Promise.all([
      apiClient.getReport(reportId),
      apiClient.getTestResults(reportId),
      apiClient.getScorePdfs(reportId),
      apiClient.getAnnexTables(reportId),
    ]);
    report = r;
    testResults = tr;
    scorePdfs = pdfs;
    annexTables = tables;
  } catch {
    // page still renders with empty state; client handles errors
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/reports/${reportId}`} className="text-gray-500 hover:text-gray-700 text-sm">
          ← Volver al informe
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Evaluación cognitiva — Ingreso de puntajes</h1>
      </div>

      <EvaluationForm
        reportId={reportId}
        selectedTests={report?.selectedTests ?? []}
        frameworkCode={report?.frameworkCode ?? 'SNP_CHC'}
        initialTestResults={testResults}
        initialScorePdfs={scorePdfs}
        initialAnnexTables={annexTables}
      />
    </div>
  );
}
