import { auth } from './auth';

const API_URL = process.env.API_URL ?? 'http://localhost:3001';

async function getAuthHeader(): Promise<Record<string, string>> {
  const session = await auth();
  const token = (session as any)?.accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message ?? `API error ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const apiClient = {
  // Patients
  getPatients: (params?: { name?: string; rut?: string }) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return apiFetch<PatientListItem[]>(`/patients${qs}`);
  },
  getPatient: (id: string) => apiFetch<PatientDetail>(`/patients/${id}`),
  createPatient: (data: CreatePatientInput) =>
    apiFetch<PatientDetail>('/patients', { method: 'POST', body: JSON.stringify(data) }),
  updatePatient: (id: string, data: Partial<CreatePatientInput>) =>
    apiFetch<PatientDetail>(`/patients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  requestPatientAccess: (id: string, reason: string) =>
    apiFetch(`/patients/${id}/access-requests`, { method: 'POST', body: JSON.stringify({ reason }) }),

  // Reports
  getReports: () => apiFetch<ReportSummary[]>('/reports'),
  getReport: (id: string) => apiFetch<ReportDetail>(`/reports/${id}`),
  createReport: (data: CreateReportInput) =>
    apiFetch<{ id: string }>('/reports', { method: 'POST', body: JSON.stringify(data) }),
  updateReport: (id: string, data: Partial<UpdateReportInput>) =>
    apiFetch(`/reports/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  transitionReport: (id: string, action: string) =>
    apiFetch(`/reports/${id}/transition`, { method: 'POST', body: JSON.stringify({ action }) }),
  saveSection: (reportId: string, sectionType: string, content: string) =>
    apiFetch<SectionSummary>(`/reports/${reportId}/sections/${sectionType}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    }),
  approveSection: (reportId: string, sectionType: string) =>
    apiFetch<SectionSummary>(`/reports/${reportId}/sections/${sectionType}/approve`, { method: 'POST' }),

  // Interview
  getInterview: (reportId: string) =>
    apiFetch<{ data: InterviewData } | null>(`/reports/${reportId}/interview`),
  upsertInterview: (reportId: string, data: InterviewData) =>
    apiFetch<{ data: InterviewData }>(`/reports/${reportId}/interview`, {
      method: 'PUT',
      body: JSON.stringify({ data }),
    }),

  // Observation
  getObservation: (reportId: string) =>
    apiFetch<{ data: ObservationData } | null>(`/reports/${reportId}/observation`),
  upsertObservation: (reportId: string, data: ObservationData) =>
    apiFetch<{ data: ObservationData }>(`/reports/${reportId}/observation`, {
      method: 'PUT',
      body: JSON.stringify({ data }),
    }),

  // Conclusion
  getConclusion: (reportId: string) =>
    apiFetch<ConclusionData>(`/reports/${reportId}/conclusion`),
  upsertConclusion: (reportId: string, input: UpsertConclusionInput) =>
    apiFetch<ConclusionData>(`/reports/${reportId}/conclusion`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  // Diagnostic Codes
  getDiagnosticCodes: (params?: { q?: string; category?: string }) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return apiFetch<DiagnosticCode[]>(`/diagnostic-codes${qs}`);
  },

  // Evaluation — score entry
  getTestResults: (reportId: string) =>
    apiFetch<TestResultData[]>(`/reports/${reportId}/test-results`),
  upsertTestScores: (reportId: string, testId: string, scores: Record<string, number | null>) =>
    apiFetch<TestResultData>(`/reports/${reportId}/test-results/${testId}`, {
      method: 'PUT',
      body: JSON.stringify({ scores }),
    }),

  // Score PDFs
  getScorePdfs: (reportId: string) =>
    apiFetch<ScorePdfData[]>(`/reports/${reportId}/score-pdfs`),
  uploadScorePdf: async (reportId: string, file: File) => {
    const authHeader = await getAuthHeader();
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_URL}/reports/${reportId}/score-pdfs`, {
      method: 'POST',
      headers: authHeader,
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message ?? `API error ${res.status}`);
    }
    return res.json() as Promise<ScorePdfData>;
  },
  deleteScorePdf: (reportId: string, pdfId: string) =>
    apiFetch<{ deleted: boolean }>(`/reports/${reportId}/score-pdfs/${pdfId}`, { method: 'DELETE' }),

  // Annex tables
  getAnnexTables: (reportId: string) =>
    apiFetch<AnnexTablesData>(`/reports/${reportId}/annex-tables`),

  // Rules engine — generate sections
  generateSections: (reportId: string, sections: string[]) =>
    apiFetch<Record<string, string>>(`/reports/${reportId}/generate-sections`, {
      method: 'POST',
      body: JSON.stringify({ sections }),
    }),

  // AI — generate drafts
  generateBackground: (reportId: string) =>
    apiFetch<AiDraftSection>(`/reports/${reportId}/ai/generate-background`, { method: 'POST' }),
  generateObservation: (reportId: string) =>
    apiFetch<AiDraftSection>(`/reports/${reportId}/ai/generate-observation`, { method: 'POST' }),
};

// ─── Local types (mirrors API responses) ──────────────────────────────────────

export interface PatientListItem {
  id: string;
  name: string;
  isAssigned: boolean;
  reportCount: number;
  birthDate?: string;
  gender?: string;
}

export interface PatientDetail {
  id: string;
  name: string;
  rut?: string;
  birthDate?: string;
  gender?: string;
  email?: string;
  phone?: string;
  isAssigned: boolean;
  reports: ReportSummary[];
}

export interface CreatePatientInput {
  name: string;
  rut?: string;
  birthDate?: string;
  gender?: string;
  email?: string;
  phone?: string;
}

export interface ReportSummary {
  id: string;
  status: string;
  frameworkCode: string;
  createdAt: string;
  updatedAt: string;
  patient?: { id: string; name: string };
  author?: { id: string; name: string };
}

export interface ReportDetail extends ReportSummary {
  supervisorId?: string;
  sections: SectionSummary[];
  selectedTests: string[];
  omitCit: boolean;
  consultationReason?: string;
}

export interface SectionSummary {
  id: string;
  sectionType: string;
  status: string;
  generatedBy: string;
  content?: string | null;
  aiRawOutput?: string | null;
  clinicianEdited?: boolean;
}

export interface CreateReportInput {
  patientId: string;
  frameworkCode: string;
  selectedTests: string[];
  supervisorId?: string;
}

export interface UpdateReportInput {
  consultationReason?: string;
  omitCit?: boolean;
  selectedTests?: string[];
}

// ─── Interview types ───────────────────────────────────────────────────────────

export interface InterviewSection1 {
  whoConsults?: string;
  whyConsults?: string;
  purposeOfEvaluation?: string;
}

export interface InterviewSection2 {
  householdMembers?: string;
  householdRelationType?: string;
  primaryCaregivers?: string;
  psychosocialContext?: string;
}

export interface InterviewData {
  section1?: InterviewSection1;
  section2?: InterviewSection2;
  section3?: Record<string, string | boolean | undefined>;
  section4?: Record<string, string | undefined>;
  section5?: Record<string, string | undefined>;
  section6?: Record<string, string | undefined>;
  section7?: Record<string, string | boolean | undefined>;
  section8?: Record<string, string | undefined>;
}

// ─── Observation types ────────────────────────────────────────────────────────

export interface ObservationData {
  cooperacion?: number;
  motivacion?: number;
  ansiedad?: number;
  toleranciaFrustracion?: number;
  atencionSostenida?: number;
  nivelActividad?: 'hipo' | 'normo' | 'hiper';
  impulsividad?: number;
  fatiga?: number;
  comprensionInstrucciones?: number;
  expresionVerbal?: 'fluida' | 'reducida' | 'excesiva';
  calidadLenguaje?: number;
  contactoVisual?: number;
  reciprocidadSocial?: number;
  relacionEvaluador?: number;
  coordinacionMotora?: number;
  conductasEstereotipadas?: number;
  rigidezConductual?: number;
  additionalObservations?: string;
}

// ─── Diagnostic & Conclusion types ────────────────────────────────────────────

export interface DiagnosticCode {
  code: string;
  name: string;
  category: string;
  specifiers: string[];
}

export interface HypothesisData {
  dxCode: string;
  dxName: string;
  specifiers: string[];
  justification?: string;
  status: 'PROVISIONAL' | 'CONFIRMED' | 'RULE_OUT';
  orderIndex: number;
}

export interface ConclusionData {
  reportId: string;
  processNarrative?: string;
  cognitiveImpact?: string;
  emotionalNote?: string;
  includeEmotionalNote: boolean;
  closingNote?: string;
  content: string;
  hypotheses: HypothesisData[];
}

export interface UpsertConclusionInput {
  processNarrative?: string;
  cognitiveImpact?: string;
  emotionalNote?: string;
  includeEmotionalNote?: boolean;
  closingNote?: string;
  hypotheses?: HypothesisData[];
}

// ─── Evaluation types ─────────────────────────────────────────────────────────

export interface ScoreSlotData {
  id: string;
  key: string;
  name: string;
  scoreType: string;
  requiresConversion: boolean;
  isInverse: boolean;
  cutoffBorderline: number | null;
  cutoffClinicallySignificant: number | null;
  orderIndex: number;
}

export interface TestResultData {
  id: string;
  testId: string;
  scores: Record<string, number | null>;
  rawScore: number | null;
  standardScore: number | null;
  scoreType: string | null;
  percentile: number | null;
  descriptor: string | null;
  test: {
    id: string;
    code: string;
    name: string;
    type: string;
    scoreSlots: ScoreSlotData[];
  };
}

export interface ScorePdfData {
  id: string;
  reportId: string;
  source: string;
  pdfHash: string;
  pdfPath: string;
  rawExtractedData: { originalName?: string } | null;
  createdAt: string;
}

export interface WechslerIndexRow {
  testCode: string; testName: string;
  slotKey: string; slotName: string;
  standardScore: number | null; percentile: number | null; descriptor: string | null;
}

export interface WechslerSubtestRow {
  testCode: string; testName: string;
  slotKey: string; slotName: string;
  scaledScore: number | null; descriptor: string | null;
}

export interface BatteryRow {
  testCode: string; testName: string;
  slotKey: string; slotName: string;
  score: number | null; scoreType: string; percentile: number | null; descriptor: string | null;
}

export interface QuestionnaireRow {
  testCode: string; testName: string;
  slotKey: string; slotName: string;
  rawScore: number | null; classification: string | null;
}

export interface AiDraftSection {
  id: string;
  sectionType: string;
  status: 'PENDING' | 'AI_GENERATED' | 'CLINICIAN_REVIEWING' | 'APPROVED';
  content: string | null;
  aiRawOutput: string | null;
  generatedBy: string;
  clinicianEdited: boolean;
}

export interface AnnexTablesData {
  wechslerIndices: WechslerIndexRow[];
  wechslerSubtests: WechslerSubtestRow[];
  battery: BatteryRow[];
  questionnaires: QuestionnaireRow[];
}
