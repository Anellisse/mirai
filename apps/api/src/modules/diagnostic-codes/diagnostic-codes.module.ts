import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { DiagnosticCodesController } from './diagnostic-codes.controller';
import { DiagnosticCodesService } from './diagnostic-codes.service';

@Module({
  controllers: [DiagnosticCodesController],
  providers: [DiagnosticCodesService, PrismaService],
})
export class DiagnosticCodesModule {}
