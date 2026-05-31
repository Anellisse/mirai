import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserPayload } from '@mirai/shared-types';
import { InterviewService } from './interview.service';
import { UpsertInterviewDto } from './dto/upsert-interview.dto';

@Controller('reports/:id/interview')
@UseGuards(JwtAuthGuard)
export class InterviewController {
  constructor(private readonly interview: InterviewService) {}

  @Get()
  get(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.interview.getInterview(id, user);
  }

  @Put()
  upsert(@Param('id') id: string, @Body() dto: UpsertInterviewDto, @CurrentUser() user: UserPayload) {
    return this.interview.upsertInterview(id, dto, user);
  }
}
