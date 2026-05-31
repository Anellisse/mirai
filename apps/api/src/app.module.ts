import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuthModule } from './modules/auth/auth.module';
import { EncryptionModule } from './modules/encryption/encryption.module';
import { PatientsModule } from './modules/patients/patients.module';
import { ReportsModule } from './modules/reports/reports.module';

@Module({
  imports: [AuthModule, EncryptionModule, PatientsModule, ReportsModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
