import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { DescriptorScalesController } from './descriptor-scales.controller';
import { DescriptorScalesService } from './descriptor-scales.service';

@Module({
  controllers: [DescriptorScalesController],
  providers: [DescriptorScalesService, PrismaService],
  exports: [DescriptorScalesService],
})
export class DescriptorScalesModule {}
