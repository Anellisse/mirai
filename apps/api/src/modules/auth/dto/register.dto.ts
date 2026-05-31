import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { Role } from '@mirai/shared-types';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(12)
  password!: string;

  @IsString()
  name!: string;

  @IsEnum(Role)
  role!: Role;

  @IsString()
  organizationId!: string;
}
