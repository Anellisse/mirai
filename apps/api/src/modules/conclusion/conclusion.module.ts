import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ReportsModule } from '../reports/reports.module';
import { ConclusionController } from './conclusion.controller';
import { ConclusionService } from './conclusion.service';

@Module({
  imports: [ReportsModule],
  controllers: [ConclusionController],
  providers: [ConclusionService, PrismaService],
})
export class ConclusionModule {}
