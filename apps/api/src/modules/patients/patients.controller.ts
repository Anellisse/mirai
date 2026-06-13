import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role, UserPayload } from '@mirai/shared-types';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientQueryDto } from './dto/patient-query.dto';

@Controller('patients')
@UseGuards(JwtAuthGuard)
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  @Get()
  findAll(@CurrentUser() user: UserPayload, @Query() query: PatientQueryDto) {
    return this.patients.findAll(user, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.patients.findOne(id, user.sub, user.organizationId);
  }

  @Post()
  create(@Body() dto: CreatePatientDto, @CurrentUser() user: UserPayload) {
    return this.patients.create(dto, user.sub, user.organizationId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePatientDto, @CurrentUser() user: UserPayload) {
    return this.patients.update(id, dto, user.sub, user.organizationId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.patients.remove(id, user.organizationId, user.sub);
  }

  @Post(':id/access-requests')
  requestAccess(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.patients.requestAccess(id, user.sub, reason, user.organizationId);
  }
}
