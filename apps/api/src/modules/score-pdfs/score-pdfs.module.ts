import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ReportsModule } from '../reports/reports.module';
import { ScorePdfsController } from './score-pdfs.controller';
import { ScorePdfsService } from './score-pdfs.service';

@Module({
  imports: [ReportsModule],
  controllers: [ScorePdfsController],
  providers: [ScorePdfsService, PrismaService],
})
export class ScorePdfsModule {}
