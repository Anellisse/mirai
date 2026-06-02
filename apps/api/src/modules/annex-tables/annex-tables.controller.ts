import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { UserPayload } from '@mirai/shared-types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnnexTablesService } from './annex-tables.service';

@Controller('reports/:id')
@UseGuards(JwtAuthGuard)
export class AnnexTablesController {
  constructor(private readonly service: AnnexTablesService) {}

  @Get('annex-tables')
  getAnnexTables(@Param('id') reportId: string, @CurrentUser() user: UserPayload) {
    return this.service.getAnnexTables(reportId, user);
  }

  @Get('cognitive-profile')
  getCognitiveProfile(@Param('id') reportId: string, @CurrentUser() user: UserPayload) {
    return this.service.getCognitiveProfile(reportId, user);
  }
}
