import { IsOptional, IsString } from 'class-validator';

export class PatientQueryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  rut?: string;
}
