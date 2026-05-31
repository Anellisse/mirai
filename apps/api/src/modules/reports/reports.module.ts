import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportStateMachineService } from './report-state-machine.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, ReportStateMachineService, PrismaService],
  exports: [ReportsService],
})
export class ReportsModule {}
