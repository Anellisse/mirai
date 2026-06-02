import {
  Controller, Delete, Get, Param, Post,
  UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UserPayload } from '@mirai/shared-types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ScorePdfsService } from './score-pdfs.service';

@Controller('reports/:id/score-pdfs')
@UseGuards(JwtAuthGuard)
export class ScorePdfsController {
  constructor(private readonly service: ScorePdfsService) {}

  @Get()
  list(@Param('id') reportId: string, @CurrentUser() user: UserPayload) {
    return this.service.list(reportId, user);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  upload(
    @Param('id') reportId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: UserPayload,
  ) {
    return this.service.upload(reportId, file, user);
  }

  @Delete(':pdfId')
  remove(
    @Param('id') reportId: string,
    @Param('pdfId') pdfId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.service.remove(reportId, pdfId, user);
  }
}
