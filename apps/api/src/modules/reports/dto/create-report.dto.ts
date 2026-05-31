import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateReportDto {
  @IsString()
  patientId!: string;

  @IsString()
  frameworkCode!: string;

  @IsArray()
  @IsString({ each: true })
  selectedTests!: string[];

  @IsOptional()
  @IsString()
  supervisorId?: string;
}
