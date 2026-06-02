import { IsObject } from 'class-validator';

export class UpsertScoresDto {
  @IsObject()
  scores!: Record<string, number | null>;
}
