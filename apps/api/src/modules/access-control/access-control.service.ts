import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccessRequestStatus } from '@prisma/client';
import { Role, UserPayload } from '@mirai/shared-types';
import { PrismaService } from '../../prisma.service';

const ADMIN_ROLES: Role[] = [Role.ADMIN, Role.SUPER_ADMIN];

@Injectable()
export class AccessControlService {
  constructor(private readonly prisma: PrismaService) {}

  async createRequest(reportId: string, reason: string, user: UserPayload) {
    const report = await this.prisma.report.findFirst({
      where: { id: reportId, organizationId: user.organizationId, deletedAt: null },
    });
    if (!report) throw new NotFoundException('Informe no encontrado');
    if (report.authorId === user.sub) {
      throw new BadRequestException('No puedes solicitar acceso a tu propio informe');
    }

    const existing = await this.prisma.accessRequest.findFirst({
      where: { reportId, requesterId: user.sub, status: AccessRequestStatus.PENDING },
    });
    if (existing) throw new ConflictException('Ya tienes una solicitud pendiente para este informe');

    const request = await this.prisma.accessRequest.create({
      data: { reportId, requesterId: user.sub, reason },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.sub,
        action: 'ACCESS_REQUESTED',
        resource: 'AccessRequest',
        resourceId: request.id,
        metadata: { reportId },
      },
    });

    return request;
  }

  async findAll(user: UserPayload) {
    const isAdmin = ADMIN_ROLES.includes(user.role as Role);
    const where = isAdmin
      ? { report: { organizationId: user.organizationId } }
      : { requesterId: user.sub };

    return this.prisma.accessRequest.findMany({
      where,
      include: {
        requester: { select: { name: true, email: true } },
        reviewedBy: { select: { name: true } },
        report: { select: { patient: { select: { name: true } } } },
        grant: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approve(requestId: string, duration: 'permanent' | '24h' | '48h', user: UserPayload) {
    if (!ADMIN_ROLES.includes(user.role as Role)) {
      throw new ForbiddenException('Solo administradores pueden aprobar solicitudes');
    }

    const request = await this.prisma.accessRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Solicitud no encontrada');
    if (request.status !== AccessRequestStatus.PENDING) {
      throw new ConflictException('La solicitud ya fue procesada');
    }

    const expiresAt =
      duration === 'permanent'
        ? null
        : duration === '24h'
          ? new Date(Date.now() + 24 * 60 * 60 * 1000)
          : new Date(Date.now() + 48 * 60 * 60 * 1000);

    await this.prisma.$transaction([
      this.prisma.accessRequest.update({
        where: { id: requestId },
        data: { status: AccessRequestStatus.APPROVED, reviewedById: user.sub, reviewedAt: new Date() },
      }),
      this.prisma.accessGrant.create({
        data: {
          requestId,
          userId: request.requesterId,
          reportId: request.reportId,
          patientId: request.patientId,
          grantedById: user.sub,
          expiresAt,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: user.sub,
          action: 'ACCESS_GRANTED',
          resource: 'AccessRequest',
          resourceId: requestId,
          metadata: { duration, reportId: request.reportId },
        },
      }),
    ]);
  }

  async reject(requestId: string, reason: string, user: UserPayload) {
    if (!ADMIN_ROLES.includes(user.role as Role)) {
      throw new ForbiddenException('Solo administradores pueden rechazar solicitudes');
    }

    const request = await this.prisma.accessRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Solicitud no encontrada');
    if (request.status !== AccessRequestStatus.PENDING) {
      throw new ConflictException('La solicitud ya fue procesada');
    }

    await this.prisma.$transaction([
      this.prisma.accessRequest.update({
        where: { id: requestId },
        data: {
          status: AccessRequestStatus.REJECTED,
          reviewedById: user.sub,
          reviewedAt: new Date(),
          rejectionReason: reason,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: user.sub,
          action: 'ACCESS_REJECTED',
          resource: 'AccessRequest',
          resourceId: requestId,
          metadata: { reason, reportId: request.reportId },
        },
      }),
    ]);
  }
}
