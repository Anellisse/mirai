import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ReportsModule } from '../reports/reports.module';
import { EvaluationController } from './evaluation.controller';
import { EvaluationService } from './evaluation.service';

@Module({
  imports: [ReportsModule],
  controllers: [EvaluationController],
  providers: [EvaluationService, PrismaService],
  exports: [EvaluationService],
})
export class EvaluationModule {}
