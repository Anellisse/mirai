import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserPayload } from '@mirai/shared-types';
import { ProcedureService } from './procedure.service';
import { UpsertProcedureDto } from './dto/upsert-procedure.dto';

@Controller('reports/:id/procedure')
@UseGuards(JwtAuthGuard)
export class ProcedureController {
  constructor(private readonly service: ProcedureService) {}

  @Get()
  get(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.service.getProcedure(id, user);
  }

  @Post()
  upsert(
    @Param('id') id: string,
    @Body() dto: UpsertProcedureDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.service.upsertProcedure(id, dto, user);
  }
}
