import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { EncryptionModule } from './modules/encryption/encryption.module';
import { PatientsModule } from './modules/patients/patients.module';
import { ReportsModule } from './modules/reports/reports.module';
import { InterviewModule } from './modules/interview/interview.module';
import { ObservationModule } from './modules/observation/observation.module';
import { ConclusionModule } from './modules/conclusion/conclusion.module';
import { DiagnosticCodesModule } from './modules/diagnostic-codes/diagnostic-codes.module';
import { DescriptorScalesModule } from './modules/descriptor-scales/descriptor-scales.module';
import { TestScoreSlotsModule } from './modules/test-score-slots/test-score-slots.module';
import { NormativeTablesModule } from './modules/normative-tables/normative-tables.module';
import { RulesEngineModule } from './modules/rules-engine/rules-engine.module';
import { EvaluationModule } from './modules/evaluation/evaluation.module';
import { ScorePdfsModule } from './modules/score-pdfs/score-pdfs.module';
import { AnnexTablesModule } from './modules/annex-tables/annex-tables.module';
import { AiModule } from './modules/ai/ai.module';
import { ExportModule } from './modules/export/export.module';
import { FinalizeModule } from './modules/finalize/finalize.module';
import { RepositoryModule } from './modules/repository/repository.module';
import { AccessControlModule } from './modules/access-control/access-control.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EncryptionModule,
    AuthModule,
    PatientsModule,
    ReportsModule,
    InterviewModule,
    ObservationModule,
    ConclusionModule,
    DiagnosticCodesModule,
    DescriptorScalesModule,
    TestScoreSlotsModule,
    NormativeTablesModule,
    RulesEngineModule,
    EvaluationModule,
    ScorePdfsModule,
    AnnexTablesModule,
    AiModule,
    ExportModule,
    FinalizeModule,
    RepositoryModule,
    AccessControlModule,
    AuditModule,
  ],
})
export class AppModule {}
