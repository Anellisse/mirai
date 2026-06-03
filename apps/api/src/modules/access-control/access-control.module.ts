import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AccessControlController } from './access-control.controller';
import { AccessControlService } from './access-control.service';

@Module({
  controllers: [AccessControlController],
  providers: [AccessControlService, PrismaService],
})
export class AccessControlModule {}
