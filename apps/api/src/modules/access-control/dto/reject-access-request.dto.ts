import { IsString, MinLength } from 'class-validator';

export class RejectAccessRequestDto {
  @IsString()
  @MinLength(5, { message: 'El motivo de rechazo es obligatorio' })
  reason!: string;
}
