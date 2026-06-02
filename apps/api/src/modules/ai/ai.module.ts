import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ReportsModule } from '../reports/reports.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [ReportsModule],
  controllers: [AiController],
  providers: [AiService, PrismaService],
})
export class AiModule {}
