import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { UserPayload } from '@mirai/shared-types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExportService } from './export.service';

@Controller('reports/:id/export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(private readonly service: ExportService) {}

  @Get('docx')
  async downloadDocx(
    @Param('id') reportId: string,
    @CurrentUser() user: UserPayload,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.service.generateDocx(reportId, user);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
