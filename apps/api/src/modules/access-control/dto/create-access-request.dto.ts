import { IsString, MinLength } from 'class-validator';

export class CreateAccessRequestDto {
  @IsString()
  @MinLength(10, { message: 'El motivo debe tener al menos 10 caracteres' })
  reason!: string;
}
