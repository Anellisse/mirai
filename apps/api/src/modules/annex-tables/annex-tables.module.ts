import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ReportsModule } from '../reports/reports.module';
import { AnnexTablesController } from './annex-tables.controller';
import { AnnexTablesService } from './annex-tables.service';

@Module({
  imports: [ReportsModule],
  controllers: [AnnexTablesController],
  providers: [AnnexTablesService, PrismaService],
  exports: [AnnexTablesService],
})
export class AnnexTablesModule {}
