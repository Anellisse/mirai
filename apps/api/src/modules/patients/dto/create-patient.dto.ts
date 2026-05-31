import { IsDateString, IsEmail, IsOptional, IsString, Matches } from 'class-validator';

export class CreatePatientDto {
  @IsString()
  name!: string;

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
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
