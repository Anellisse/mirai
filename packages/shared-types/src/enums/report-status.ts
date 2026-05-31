export enum ReportStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  SUPERVISOR_REVIEW = 'SUPERVISOR_REVIEW',
  APPROVED = 'APPROVED',
  EXPORTED = 'EXPORTED',
  FINAL = 'FINAL',
}

export const VALID_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  [ReportStatus.DRAFT]: [ReportStatus.IN_PROGRESS],
  [ReportStatus.IN_PROGRESS]: [ReportStatus.REVIEW],
  [ReportStatus.REVIEW]: [ReportStatus.SUPERVISOR_REVIEW, ReportStatus.APPROVED],
  [ReportStatus.SUPERVISOR_REVIEW]: [ReportStatus.APPROVED, ReportStatus.IN_PROGRESS],
  [ReportStatus.APPROVED]: [ReportStatus.EXPORTED],
  [ReportStatus.EXPORTED]: [ReportStatus.FINAL],
  [ReportStatus.FINAL]: [],
};
