import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { UserPayload } from '@mirai/shared-types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnnexTablesService } from './annex-tables.service';

@Controller('reports/:id/annex-tables')
@UseGuards(JwtAuthGuard)
export class AnnexTablesController {
  constructor(private readonly service: AnnexTablesService) {}

  @Get()
  getAnnexTables(@Param('id') reportId: string, @CurrentUser() user: UserPayload) {
    return this.service.getAnnexTables(reportId, user);
  }
}
