import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserPayload } from '@mirai/shared-types';
import { ConclusionService } from './conclusion.service';
import { UpsertConclusionDto } from './dto/upsert-conclusion.dto';

@Controller('reports/:id/conclusion')
@UseGuards(JwtAuthGuard)
export class ConclusionController {
  constructor(private readonly conclusion: ConclusionService) {}

  @Get()
  get(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.conclusion.getConclusion(id, user);
  }

  @Put()
  upsert(@Param('id') id: string, @Body() dto: UpsertConclusionDto, @CurrentUser() user: UserPayload) {
    return this.conclusion.upsertConclusion(id, dto, user);
  }
}
