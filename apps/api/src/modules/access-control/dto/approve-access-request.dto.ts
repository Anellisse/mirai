import { IsIn } from 'class-validator';

export class ApproveAccessRequestDto {
  @IsIn(['permanent', '24h', '48h'])
  duration!: 'permanent' | '24h' | '48h';
}
