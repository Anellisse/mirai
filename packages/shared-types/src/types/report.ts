import { ReportStatus } from '../enums/report-status';
import { SectionType } from '../enums/section-types';
import { FrameworkCode } from '../enums/framework-types';

export interface ReportSummary {
  id: string;
  patientId: string;
  patientMaskedName: string;
  authorName: string;
  status: ReportStatus;
  frameworkCode: FrameworkCode;
  createdAt: string;
  updatedAt: string;
}

export interface SectionContent {
  sectionType: SectionType;
  content: unknown;
}
