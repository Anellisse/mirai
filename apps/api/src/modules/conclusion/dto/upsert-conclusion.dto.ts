import { IsBoolean, IsOptional, IsString, IsArray, ValidateNested, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum DiagnosticStatusDto {
  PROVISIONAL = 'PROVISIONAL',
  CONFIRMED = 'CONFIRMED',
  RULE_OUT = 'RULE_OUT',
}

export class HypothesisDto {
  @IsString()
  dxCode!: string;

  @IsString()
  dxName!: string;

  @IsArray()
  @IsString({ each: true })
  specifiers!: string[];

  @IsOptional()
  @IsString()
  justification?: string;

  @IsEnum(DiagnosticStatusDto)
  status!: DiagnosticStatusDto;

  @IsInt()
  @Min(0)
  orderIndex!: number;
}

export class UpsertConclusionDto {
  @IsOptional()
  @IsString()
  processNarrative?: string;

  @IsOptional()
  @IsString()
  cognitiveImpact?: string;

  @IsOptional()
  @IsString()
  emotionalNote?: string;

  @IsOptional()
  @IsBoolean()
  includeEmotionalNote?: boolean;

  @IsOptional()
  @IsString()
  closingNote?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HypothesisDto)
  hypotheses?: HypothesisDto[];
}
