import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserPayload } from '@mirai/shared-types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditService } from './audit.service';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get()
  findAll(@CurrentUser() user: UserPayload, @Query('page') page?: string) {
    return this.service.findAll(user, page ? parseInt(page, 10) : 1);
  }
}
