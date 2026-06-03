import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserPayload } from '@mirai/shared-types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccessControlService } from './access-control.service';
import { ApproveAccessRequestDto } from './dto/approve-access-request.dto';
import { CreateAccessRequestDto } from './dto/create-access-request.dto';
import { RejectAccessRequestDto } from './dto/reject-access-request.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class AccessControlController {
  constructor(private readonly service: AccessControlService) {}

  @Post('reports/:id/access-requests')
  create(
    @Param('id') reportId: string,
    @Body() dto: CreateAccessRequestDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.service.createRequest(reportId, dto.reason, user);
  }

  @Get('access-requests')
  findAll(@CurrentUser() user: UserPayload) {
    return this.service.findAll(user);
  }

  @Post('access-requests/:id/approve')
  approve(
    @Param('id') requestId: string,
    @Body() dto: ApproveAccessRequestDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.service.approve(requestId, dto.duration, user);
  }

  @Post('access-requests/:id/reject')
  reject(
    @Param('id') requestId: string,
    @Body() dto: RejectAccessRequestDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.service.reject(requestId, dto.reason, user);
  }
}
