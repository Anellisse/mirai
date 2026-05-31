import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserPayload } from '@mirai/shared-types';
import { ObservationService } from './observation.service';
import { UpsertObservationDto } from './dto/upsert-observation.dto';

@Controller('reports/:id/observation')
@UseGuards(JwtAuthGuard)
export class ObservationController {
  constructor(private readonly observation: ObservationService) {}

  @Get()
  get(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.observation.getObservation(id, user);
  }

  @Put()
  upsert(@Param('id') id: string, @Body() dto: UpsertObservationDto, @CurrentUser() user: UserPayload) {
    return this.observation.upsertObservation(id, dto, user);
  }
}
