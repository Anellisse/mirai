import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { ReportsService } from '../reports/reports.service';
import { UserPayload } from '@mirai/shared-types';
import { UpsertInterviewDto } from './dto/upsert-interview.dto';

@Injectable()
export class InterviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportsService: ReportsService,
  ) {}

  async getInterview(reportId: string, user: UserPayload) {
    await this.reportsService.checkEditAccess(reportId, user);
    return this.prisma.interviewForm.findUnique({ where: { reportId } });
  }

  async upsertInterview(reportId: string, dto: UpsertInterviewDto, user: UserPayload) {
    await this.reportsService.checkEditAccess(reportId, user);
    return this.prisma.interviewForm.upsert({
      where: { reportId },
      update: { data: dto.data as Prisma.InputJsonValue },
      create: { reportId, data: dto.data as Prisma.InputJsonValue },
    });
  }
}
