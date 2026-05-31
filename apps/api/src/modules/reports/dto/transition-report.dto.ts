import { IsIn } from 'class-validator';

export class TransitionReportDto {
  @IsIn(['start', 'submit', 'approve', 'export', 'finalize'])
  action!: string;
}
