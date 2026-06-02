import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiClient, AiDraftSection } from '@/lib/api-client';
import { InterviewForm } from './_components/interview-form';
import { AiDraftPanel } from '../_components/ai-draft-panel';

export default async function InterviewPage({ params }: { params: { id: string } }) {
  let initial;
  let backgroundSection: AiDraftSection | null = null;

  try {
    const [interviewResult, report] = await Promise.all([
      apiClient.getInterview(params.id),
      apiClient.getReport(params.id),
    ]);
    initial = interviewResult?.data ?? {};
    const sec = report.sections.find((s) => s.sectionType === 'BACKGROUND');
    if (sec) {
      backgroundSection = {
        id: sec.id,
        sectionType: sec.sectionType,
        status: sec.status as AiDraftSection['status'],
        content: sec.content ?? null,
        aiRawOutput: sec.aiRawOutput ?? null,
        generatedBy: sec.generatedBy,
        clinicianEdited: sec.clinicianEdited ?? false,
      };
    }
  } catch {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/reports/${params.id}`} className="text-gray-500 hover:text-gray-700 text-sm">
          ← Volver al informe
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Antecedentes relevantes</h1>
      </div>

      <InterviewForm reportId={params.id} initial={initial} />

      <AiDraftPanel
        reportId={params.id}
        sectionType="BACKGROUND"
        initialSection={backgroundSection}
      />
    </div>
  );
}
