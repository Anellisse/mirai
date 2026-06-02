import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';

export enum TableType {
  LOOKUP = 'lookup',
  FORMULA = 'formula',
}

export class CreateNormativeTableDto {
  @IsString()
  slotId!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsArray()
  demographicVariables!: string[];

  @IsEnum(TableType)
  tableType!: TableType;

  @IsOptional()
  entries?: FormulaEntry[];
}

export type FormulaEntry = {
  ageMin?: number;
  ageMax?: number;
  educationYearsMin?: number;
  educationYearsMax?: number;
  gender?: string;
  formulaType: string;
  parameters: Record<string, number>;
};
