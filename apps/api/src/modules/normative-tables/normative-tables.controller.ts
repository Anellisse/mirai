import {
  Body, Controller, Delete, Get, Param, Post, Put, Query,
  UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateNormativeTableDto } from './dto/create-normative-table.dto';
import { NormativeTablesService } from './normative-tables.service';

@Controller('normative-tables')
@UseGuards(JwtAuthGuard)
export class NormativeTablesController {
  constructor(private readonly service: NormativeTablesService) {}

  @Get()
  findBySlot(@Query('slotId') slotId: string) {
    return this.service.findBySlot(slotId);
  }

  @Post()
  @UseInterceptors(FileInterceptor('csv'))
  create(@Body() dto: CreateNormativeTableDto, @UploadedFile() file?: Express.Multer.File) {
    return this.service.create(dto, file?.buffer);
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('csv'))
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateNormativeTableDto>,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.update(id, dto, file?.buffer);
  }

  @Delete(':id')
  deactivate(@Param('id') id: string) {
    return this.service.deactivate(id);
  }
}
