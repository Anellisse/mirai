import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ReportsModule } from '../reports/reports.module';
import { ProcedureController } from './procedure.controller';
import { ProcedureService } from './procedure.service';

@Module({
  imports: [ReportsModule],
  controllers: [ProcedureController],
  providers: [ProcedureService, PrismaService],
  exports: [ProcedureService],
})
export class ProcedureModule {}
