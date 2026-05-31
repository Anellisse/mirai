import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ReportsService } from '../reports/reports.service';
import { UserPayload } from '@mirai/shared-types';
import { UpsertObservationDto } from './dto/upsert-observation.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ObservationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportsService: ReportsService,
  ) {}

  async getObservation(reportId: string, user: UserPayload) {
    await this.reportsService.checkEditAccess(reportId, user);
    return this.prisma.observationChecklist.findUnique({ where: { reportId } });
  }

  async upsertObservation(reportId: string, dto: UpsertObservationDto, user: UserPayload) {
    await this.reportsService.checkEditAccess(reportId, user);
    return this.prisma.observationChecklist.upsert({
      where: { reportId },
      update: { data: dto.data as Prisma.InputJsonValue },
      create: { reportId, data: dto.data as Prisma.InputJsonValue },
    });
  }
}
