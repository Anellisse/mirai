import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { UserPayload } from '@mirai/shared-types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpsertScoresDto } from './dto/upsert-scores.dto';
import { EvaluationService } from './evaluation.service';

@Controller('reports/:id/test-results')
@UseGuards(JwtAuthGuard)
export class EvaluationController {
  constructor(private readonly service: EvaluationService) {}

  @Get()
  getTestResults(@Param('id') reportId: string, @CurrentUser() user: UserPayload) {
    return this.service.getTestResults(reportId, user);
  }

  @Put(':testId')
  upsertScores(
    @Param('id') reportId: string,
    @Param('testId') testId: string,
    @Body() dto: UpsertScoresDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.service.upsertScores(reportId, testId, dto, user);
  }
}
