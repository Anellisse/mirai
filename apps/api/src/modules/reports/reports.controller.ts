import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserPayload } from '@mirai/shared-types';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { TransitionReportDto } from './dto/transition-report.dto';
import { UpdateSectionDto } from './dto/update-section.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  create(@Body() dto: CreateReportDto, @CurrentUser() user: UserPayload) {
    return this.reports.create(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: UserPayload) {
    return this.reports.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.reports.findOne(id, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateReportDto, @CurrentUser() user: UserPayload) {
    return this.reports.update(id, dto, user);
  }

  @Post(':id/transition')
  transition(
    @Param('id') id: string,
    @Body() dto: TransitionReportDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.reports.executeTransition(id, dto.action, user);
  }

  @Patch(':id/sections/:sectionType')
  saveSection(
    @Param('id') id: string,
    @Param('sectionType') sectionType: string,
    @Body() dto: UpdateSectionDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.reports.saveSection(id, sectionType, dto.content ?? '', user, dto.sourceData);
  }

  @Post(':id/sections/:sectionType/approve')
  approveSection(
    @Param('id') id: string,
    @Param('sectionType') sectionType: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.reports.approveSection(id, sectionType, user);
  }
}
