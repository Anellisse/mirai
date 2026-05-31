import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ReportsModule } from '../reports/reports.module';
import { ObservationController } from './observation.controller';
import { ObservationService } from './observation.service';

@Module({
  imports: [ReportsModule],
  controllers: [ObservationController],
  providers: [ObservationService, PrismaService],
})
export class ObservationModule {}
