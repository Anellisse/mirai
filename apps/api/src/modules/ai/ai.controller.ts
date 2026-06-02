import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { UserPayload } from '@mirai/shared-types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';

@Controller('reports/:id/ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly service: AiService) {}

  @Post('generate-background')
  generateBackground(@Param('id') reportId: string, @CurrentUser() user: UserPayload) {
    return this.service.generateBackground(reportId, user);
  }

  @Post('generate-observation')
  generateObservation(@Param('id') reportId: string, @CurrentUser() user: UserPayload) {
    return this.service.generateObservation(reportId, user);
  }
}
