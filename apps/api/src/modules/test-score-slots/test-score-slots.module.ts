import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { TestScoreSlotsController } from './test-score-slots.controller';
import { TestScoreSlotsService } from './test-score-slots.service';

@Module({
  controllers: [TestScoreSlotsController],
  providers: [TestScoreSlotsService, PrismaService],
  exports: [TestScoreSlotsService],
})
export class TestScoreSlotsModule {}
