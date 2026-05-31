import { IsObject } from 'class-validator';

export class UpsertInterviewDto {
  @IsObject()
  data!: Record<string, unknown>;
}
