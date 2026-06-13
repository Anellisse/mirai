import { Controller, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
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

  @Post('generate-background-from-pdf')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  generateBackgroundFromPdf(
    @Param('id') reportId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: UserPayload,
  ) {
    return this.service.generateBackgroundFromPdf(reportId, file.buffer, user);
  }

  @Post('extract-interview-pdf')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  extractInterviewFromPdf(
    @Param('id') reportId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: UserPayload,
  ) {
    return this.service.extractInterviewFromPdf(reportId, file.buffer, user);
  }
}
