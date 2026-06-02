import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GenerateSectionsDto } from './dto/generate-sections.dto';
import { RulesEngineService } from './rules-engine.service';

@Controller('reports/:id/generate-sections')
@UseGuards(JwtAuthGuard)
export class RulesEngineController {
  constructor(private readonly service: RulesEngineService) {}

  @Post()
  generate(
    @Param('id') reportId: string,
    @Body() dto: GenerateSectionsDto,
    @CurrentUser() user: { sub: string; organizationId: string },
  ) {
    return this.service.generateSections(reportId, dto.sections, user);
  }
}
