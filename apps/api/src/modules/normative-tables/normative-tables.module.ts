import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PrismaService } from '../../prisma.service';
import { NormativeTablesController } from './normative-tables.controller';
import { NormativeTablesService } from './normative-tables.service';

@Module({
  imports: [MulterModule.register({ storage: memoryStorage() })],
  controllers: [NormativeTablesController],
  providers: [NormativeTablesService, PrismaService],
  exports: [NormativeTablesService],
})
export class NormativeTablesModule {}
