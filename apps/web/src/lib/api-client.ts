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
    apiFetch(`/reports/${reportId}/sections/${sectionType}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    }),
  approveSection: (reportId: string, sectionType: string) =>
    apiFetch(`/reports/${reportId}/sections/${sectionType}/approve`, { method: 'POST' }),
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
}

export interface SectionSummary {
  id: string;
  sectionType: string;
  status: string;
  generatedBy: string;
  content?: string;
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
