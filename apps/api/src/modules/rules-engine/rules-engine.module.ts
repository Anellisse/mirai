import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { DescriptorService } from './descriptor.service';
import { DictionaryService } from './dictionary.service';
import { NormativeService } from './normative.service';
import { RulesEngineController } from './rules-engine.controller';
import { RulesEngineService } from './rules-engine.service';

@Module({
  controllers: [RulesEngineController],
  providers: [
    RulesEngineService,
    NormativeService,
    DescriptorService,
    DictionaryService,
    PrismaService,
  ],
  exports: [RulesEngineService],
})
export class RulesEngineModule {}
