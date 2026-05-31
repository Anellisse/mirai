import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateReportDto {
  @IsOptional()
  @IsString()
  consultationReason?: string;

  @IsOptional()
  @IsBoolean()
  omitCit?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedTests?: string[];
}
