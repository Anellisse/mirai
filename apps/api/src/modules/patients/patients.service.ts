import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserPayload } from '@mirai/shared-types';
import { PrismaService } from '../../prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientQueryDto } from './dto/patient-query.dto';

@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async isAssigned(userId: string, patientId: string): Promise<boolean> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, deletedAt: null },
    });
    if (!patient) return false;
    if (patient.createdById === userId) return true;

    const report = await this.prisma.report.findFirst({
      where: {
        patientId,
        deletedAt: null,
        OR: [{ authorId: userId }, { supervisorId: userId }],
      },
    });
    return !!report;
  }

  private async hasActiveGrant(userId: string, patientId: string): Promise<boolean> {
    const grant = await this.prisma.accessGrant.findFirst({
      where: {
        userId,
        patientId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
    return !!grant;
  }

  async findAll(user: UserPayload, query: PatientQueryDto) {
    const { sub: userId, organizationId, role } = user;
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

    const where: Record<string, unknown> = { organizationId, deletedAt: null };

    if (query.rut) where.rutHash = this.encryption.hashRut(query.rut);
    if (query.name) where.name = { contains: query.name, mode: 'insensitive' };

    const patients = await this.prisma.patient.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        birthDate: true,
        gender: true,
        interviewDate: true,
        finalDiagnosis: true,
        createdAt: true,
        createdById: true,
        createdBy: { select: { name: true } },
        _count: { select: { reports: { where: { deletedAt: null } } } },
      },
    });

    return Promise.all(
      patients.map(async (p) => {
        const assigned = await this.isAssigned(userId, p.id);
        const base = {
          id: p.id,
          name: p.name,
          isAssigned: assigned,
          reportCount: (p as any)._count?.reports ?? 0,
          createdAt: p.createdAt,
          createdByName: (p as any).createdBy?.name ?? null,
        };
        if (!assigned) return base;
        return {
          ...base,
          birthDate: p.birthDate,
          gender: p.gender,
          interviewDate: p.interviewDate,
          ...(isAdmin ? { finalDiagnosis: p.finalDiagnosis } : {}),
        };
      }),
    );
  }

  async findOne(patientId: string, userId: string, organizationId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, organizationId, deletedAt: null },
      include: {
        reports: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          select: { id: true, status: true, frameworkCode: true, createdAt: true },
        },
      },
    });

    if (!patient) throw new NotFoundException('Paciente no encontrado');

    const assigned = await this.isAssigned(userId, patientId);
    const granted = !assigned && (await this.hasActiveGrant(userId, patientId));

    if (!assigned && !granted) throw new ForbiddenException('Sin acceso al paciente');

    const { rutEncrypted, rutHash, email: _email, phone: _phone, ...safe } = patient as any;
    const rut = rutEncrypted ? this.encryption.decryptRut(rutEncrypted) : null;
    return { ...safe, rut };
  }

  async create(dto: CreatePatientDto, userId: string, organizationId: string) {
    const data: Record<string, unknown> = {
      name: dto.name,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      gender: dto.gender,
      laterality: dto.laterality,
      interviewDate: dto.interviewDate ? new Date(dto.interviewDate) : undefined,
      schoolName: dto.schoolName,
      schoolGrade: dto.schoolGrade,
      currentInstitution: dto.currentInstitution,
      occupation: dto.occupation,
      finalDiagnosis: dto.finalDiagnosis,
      organizationId,
      createdById: userId,
    };

    if (dto.rut) {
      data.rutHash = this.encryption.hashRut(dto.rut);
      data.rutEncrypted = this.encryption.encryptRut(dto.rut);
    }

    return this.prisma.patient.create({ data: data as any });
  }

  async update(patientId: string, dto: UpdatePatientDto, userId: string, organizationId: string) {
    const assigned = await this.isAssigned(userId, patientId);
    if (!assigned) throw new ForbiddenException('Sin acceso al paciente');

    const data: Record<string, unknown> = {
      name: dto.name,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      gender: dto.gender,
      laterality: dto.laterality,
      interviewDate: dto.interviewDate ? new Date(dto.interviewDate) : undefined,
      schoolName: dto.schoolName,
      schoolGrade: dto.schoolGrade,
      currentInstitution: dto.currentInstitution,
      occupation: dto.occupation,
      finalDiagnosis: dto.finalDiagnosis,
    };

    if (dto.rut) {
      data.rutHash = this.encryption.hashRut(dto.rut);
      data.rutEncrypted = this.encryption.encryptRut(dto.rut);
    }

    return this.prisma.patient.update({
      where: { id: patientId, organizationId },
      data: data as any,
    });
  }

  async remove(patientId: string, organizationId: string, userId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, organizationId, deletedAt: null },
    });
    if (!patient) throw new NotFoundException('Paciente no encontrado');

    const assigned = await this.isAssigned(userId, patientId);
    if (!assigned) throw new ForbiddenException('Sin acceso al paciente');

    return this.prisma.patient.update({
      where: { id: patientId },
      data: { deletedAt: new Date() },
    });
  }

  async requestAccess(patientId: string, requesterId: string, reason: string, organizationId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, organizationId, deletedAt: null },
    });
    if (!patient) throw new NotFoundException('Paciente no encontrado');

    return this.prisma.accessRequest.create({
      data: { requesterId, patientId, reason },
    });
  }
}
