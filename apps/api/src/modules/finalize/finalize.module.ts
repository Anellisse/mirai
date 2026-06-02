import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ExportModule } from '../export/export.module';
import { ReportsModule } from '../reports/reports.module';
import { FinalizeController } from './finalize.controller';
import { FinalizeService } from './finalize.service';

@Module({
  imports: [ReportsModule, ExportModule],
  controllers: [FinalizeController],
  providers: [FinalizeService, PrismaService],
})
export class FinalizeModule {}
