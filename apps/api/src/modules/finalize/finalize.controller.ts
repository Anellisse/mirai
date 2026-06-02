import {
  Body, Controller, Get, Param, Post,
  UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UserPayload } from '@mirai/shared-types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FinalizeReportDto } from './dto/finalize-report.dto';
import { FinalizeService } from './finalize.service';

@Controller('reports/:id')
@UseGuards(JwtAuthGuard)
export class FinalizeController {
  constructor(private readonly service: FinalizeService) {}

  @Get('final-report')
  getFinalReport(@Param('id') reportId: string, @CurrentUser() user: UserPayload) {
    return this.service.getFinalReport(reportId, user);
  }

  @Post('finalize')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  finalize(
    @Param('id') reportId: string,
    @Body() dto: FinalizeReportDto,
    @CurrentUser() user: UserPayload,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.finalize(reportId, dto.source, user, file);
  }
}
