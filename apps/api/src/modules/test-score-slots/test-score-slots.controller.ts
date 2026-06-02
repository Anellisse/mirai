import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TestScoreSlotsService } from './test-score-slots.service';

@Controller('test-score-slots')
@UseGuards(JwtAuthGuard)
export class TestScoreSlotsController {
  constructor(private readonly service: TestScoreSlotsService) {}

  @Get()
  findByTest(@Query('testId') testId: string) {
    return this.service.findByTest(testId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
