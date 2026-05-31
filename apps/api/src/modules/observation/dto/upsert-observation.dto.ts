import { IsObject } from 'class-validator';

export class UpsertObservationDto {
  @IsObject()
  data!: Record<string, unknown>;
}
