import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AnnexTablesModule } from '../annex-tables/annex-tables.module';
import { ReportsModule } from '../reports/reports.module';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';

@Module({
  imports: [ReportsModule, AnnexTablesModule],
  controllers: [ExportController],
  providers: [ExportService, PrismaService],
  exports: [ExportService],
})
export class ExportModule {}
