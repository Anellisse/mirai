import { InternalServerErrorException } from '@nestjs/common';
import { Role, UserPayload } from '@mirai/shared-types';

// Mock Anthropic SDK before importing AiService
const mockMessagesCreate = jest.fn().mockResolvedValue({
  content: [{ type: 'text', text: 'Borrador clínico generado por IA.' }],
});
const MockAnthropic = jest.fn().mockImplementation(() => ({
  messages: { create: mockMessagesCreate },
}));
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: MockAnthropic,
}));

// Ensure API key is set before module loads
process.env.ANTHROPIC_API_KEY = 'test-key';

import { AiService } from '../ai.service';

const USER: UserPayload = {
  sub: 'user1',
  organizationId: 'org1',
  role: Role.CLINICO_SENIOR,
  email: 'a@b.com',
  twoFactorVerified: true,
};

const INTERVIEW_DATA = {
  section1: { whoConsults: 'Padres', whyConsults: 'Dificultades de atención', purposeOfEvaluation: 'Diagnóstico diferencial' },
  section2: { householdMembers: 'Padre, madre, paciente', householdRelationType: 'biparental' },
  section7: { educationLevel: '5° básico' },
  section8: { previousDiagnoses: '', currentMedication: 'Ritalín 10 mg' },
};

const OBSERVATION_DATA = {
  cooperacion: 1,
  motivacion: 0,
  ansiedad: 2,
  toleranciaFrustracion: 1,
  atencionSostenida: 2,
  nivelActividad: 'hiper',
  expresionVerbal: 'fluida',
};

function makePrisma(
  interviewData: object | null = INTERVIEW_DATA,
  observationData: object | null = OBSERVATION_DATA,
  existingSection: object | null = null,
) {
  return {
    report: {
      findUnique: jest.fn().mockResolvedValue({ patient: { name: 'María González' } }),
    },
    interviewForm: {
      findUnique: jest.fn().mockResolvedValue(interviewData ? { data: interviewData } : null),
    },
    observationChecklist: {
      findUnique: jest.fn().mockResolvedValue(observationData ? { data: observationData } : null),
    },
    reportSection: {
      findFirst: jest.fn().mockResolvedValue(existingSection),
      create: jest.fn().mockResolvedValue({ id: 'sec1', sectionType: 'BACKGROUND', status: 'AI_GENERATED', content: 'draft', aiRawOutput: 'draft' }),
      update: jest.fn().mockResolvedValue({ id: 'sec1', sectionType: 'BACKGROUND', status: 'AI_GENERATED', content: 'draft', aiRawOutput: 'draft' }),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  };
}

const mockReportsService = { checkEditAccess: jest.fn().mockResolvedValue(undefined) };

describe('AiService', () => {
  describe('generateBackground', () => {
    it('checks edit access before generating', async () => {
      const prisma = makePrisma();
      const service = new AiService(prisma as any, mockReportsService as any);
      await service.generateBackground('rep1', USER);
      expect(mockReportsService.checkEditAccess).toHaveBeenCalledWith('rep1', USER);
    });

    it('calls Claude with structured interview data and saves AI_GENERATED section', async () => {
      const prisma = makePrisma();
      const service = new AiService(prisma as any, mockReportsService as any);
      const result = await service.generateBackground('rep1', USER);
      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'claude-sonnet-4-6', max_tokens: 2048 }),
      );
      expect(prisma.reportSection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'AI_GENERATED', generatedBy: 'AI' }),
        }),
      );
      expect(result.status).toBe('AI_GENERATED');
    });

    it('updates existing section if it exists and is not APPROVED', async () => {
      const existing = { id: 'sec1', status: 'AI_GENERATED', sectionType: 'BACKGROUND' };
      const prisma = makePrisma(INTERVIEW_DATA, OBSERVATION_DATA, existing);
      const service = new AiService(prisma as any, mockReportsService as any);
      await service.generateBackground('rep1', USER);
      expect(prisma.reportSection.update).toHaveBeenCalled();
      expect(prisma.reportSection.create).not.toHaveBeenCalled();
    });

    it('does NOT overwrite an APPROVED section', async () => {
      const approved = { id: 'sec1', status: 'APPROVED', sectionType: 'BACKGROUND' };
      const prisma = makePrisma(INTERVIEW_DATA, OBSERVATION_DATA, approved);
      const service = new AiService(prisma as any, mockReportsService as any);
      const result = await service.generateBackground('rep1', USER);
      expect(prisma.reportSection.update).not.toHaveBeenCalled();
      expect(prisma.reportSection.create).not.toHaveBeenCalled();
      expect(result).toBe(approved);
    });

    it('handles missing interview form gracefully (empty data)', async () => {
      const prisma = makePrisma(null);
      const service = new AiService(prisma as any, mockReportsService as any);
      await expect(service.generateBackground('rep1', USER)).resolves.toBeDefined();
    });

    it('creates audit log entry after generation', async () => {
      const prisma = makePrisma();
      const service = new AiService(prisma as any, mockReportsService as any);
      await service.generateBackground('rep1', USER);
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'AI_DRAFT_GENERATED', userId: USER.sub }),
        }),
      );
    });
  });

  describe('generateObservation', () => {
    it('calls Claude with observation checklist and saves AI_GENERATED section', async () => {
      const prisma = makePrisma();
      const service = new AiService(prisma as any, mockReportsService as any);
      await service.generateObservation('rep1', USER);
      expect(prisma.reportSection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ sectionType: 'OBSERVED_BEHAVIOR', status: 'AI_GENERATED' }),
        }),
      );
    });

    it('handles missing checklist gracefully', async () => {
      const prisma = makePrisma(INTERVIEW_DATA, null);
      const service = new AiService(prisma as any, mockReportsService as any);
      await expect(service.generateObservation('rep1', USER)).resolves.toBeDefined();
    });
  });

  describe('initialization', () => {
    it('throws InternalServerErrorException when API key is missing', () => {
      const savedKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      expect(() => new AiService({} as any, {} as any)).toThrow(InternalServerErrorException);
      process.env.ANTHROPIC_API_KEY = savedKey;
    });
  });
});
