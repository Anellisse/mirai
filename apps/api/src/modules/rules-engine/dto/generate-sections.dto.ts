import { IsArray, IsEnum } from 'class-validator';

export enum SectionTypeEnum {
  COGNITIVE_EVALUATION = 'COGNITIVE_EVALUATION',
  QUESTIONNAIRE_SYMPTOMS = 'QUESTIONNAIRE_SYMPTOMS',
  SOCIAL_COGNITION = 'SOCIAL_COGNITION',
  RESULTS_SYNTHESIS = 'RESULTS_SYNTHESIS',
}

export class GenerateSectionsDto {
  @IsArray()
  @IsEnum(SectionTypeEnum, { each: true })
  sections!: SectionTypeEnum[];
}
