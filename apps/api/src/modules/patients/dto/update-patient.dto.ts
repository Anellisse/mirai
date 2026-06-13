import { IsBoolean, IsDateString, IsOptional, IsString, Matches } from 'class-validator';

export class UpdatePatientDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[\d.]+[-][\dkK]$|^\d+[kK]?$/, { message: 'Formato de RUT inválido' })
  rut?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  laterality?: string;

  @IsOptional()
  @IsDateString()
  interviewDate?: string;

  @IsOptional()
  @IsString()
  schoolName?: string;

  @IsOptional()
  @IsString()
  schoolGrade?: string;

  @IsOptional()
  @IsString()
  currentInstitution?: string;

  @IsOptional()
  @IsString()
  occupation?: string;

  @IsOptional()
  @IsString()
  finalDiagnosis?: string;

  @IsOptional()
  @IsBoolean()
  dataConsent?: boolean;
}
