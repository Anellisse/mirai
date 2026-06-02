import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum FinalReportSourceEnum {
  SYSTEM_PDF = 'SYSTEM_PDF',
  UPLOADED = 'UPLOADED',
}

export class FinalizeReportDto {
  @IsEnum(FinalReportSourceEnum)
  source!: FinalReportSourceEnum;

  @IsOptional()
  @IsString()
  notes?: string;
}
