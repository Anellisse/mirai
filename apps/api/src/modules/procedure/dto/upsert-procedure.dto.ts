import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export enum InterviewWith {
  PARENTS = 'PARENTS',
  PATIENT = 'PATIENT',
  BOTH = 'BOTH',
  NONE = 'NONE',
}

export enum SessionModality {
  PRESENCIAL = 'PRESENCIAL',
  TELEPRESENCIAL = 'TELEPRESENCIAL',
}

export enum QuestionnaireRespondent {
  FAMILY = 'FAMILY',
  PATIENT = 'PATIENT',
  TEACHER = 'TEACHER',
  OTHER = 'OTHER',
}

export class UpsertProcedureDto {
  @IsArray()
  @IsString({ each: true })
  selectedTests!: string[];

  @IsEnum(InterviewWith)
  interviewWith!: InterviewWith;

  @IsEnum(SessionModality)
  interviewModality!: SessionModality;

  @IsEnum(SessionModality)
  adirModality!: SessionModality;

  @IsBoolean()
  questionnairesShared!: boolean;

  @IsOptional()
  @IsEnum(QuestionnaireRespondent)
  questionnaireRespondent?: QuestionnaireRespondent | null;

  @IsOptional()
  @IsString()
  questionnaireRespondentCustom?: string;
}
