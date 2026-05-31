import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DiagnosticCodesService } from './diagnostic-codes.service';

@Controller('diagnostic-codes')
@UseGuards(JwtAuthGuard)
export class DiagnosticCodesController {
  constructor(private readonly codes: DiagnosticCodesService) {}

  @Get()
  search(@Query('q') q?: string, @Query('category') category?: string) {
    return this.codes.search({ q, category });
  }
}
