import { Injectable } from '@nestjs/common';
import { AccessRequestStatus } from '@prisma/client';
import { PrismaService } from '../../prisma.service';

function maskName(name: string): string {
  return name
    .split(' ')
    .map((word) => (word.length > 0 ? word[0] + '*'.repeat(word.length - 1) : ''))
    .join(' ');
}

@Injectable()
export class RepositoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, organizationId: string) {
    const reports = await this.prisma.report.findMany({
      where: { organizationId, deletedAt: null },
      include: {
        patient: { select: { name: true } },
        author: { select: { name: true, title: true } },
        accessGrants: {
          where: {
            userId,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
        },
        accessRequests: {
          where: { requesterId: userId, status: AccessRequestStatus.PENDING },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reports.map((r) => {
      const isOwn = r.authorId === userId;
      const hasAccess = isOwn || r.accessGrants.length > 0;
      const pendingRequest = r.accessRequests.length > 0;
      return {
        id: r.id,
        status: r.status,
        frameworkCode: r.frameworkCode,
        createdAt: r.createdAt,
        author: r.author,
        isOwn,
        hasAccess,
        pendingRequest,
        patientName: hasAccess ? r.patient.name : maskName(r.patient.name),
      };
    });
  }
}
