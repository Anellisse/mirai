import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserPayload } from '@mirai/shared-types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RepositoryService } from './repository.service';

@Controller('repository')
@UseGuards(JwtAuthGuard)
export class RepositoryController {
  constructor(private readonly service: RepositoryService) {}

  @Get('reports')
  findAll(@CurrentUser() user: UserPayload) {
    return this.service.findAll(user.sub, user.organizationId);
  }
}
