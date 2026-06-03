import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role, UserPayload } from '@mirai/shared-types';
import { PrismaService } from '../../prisma.service';

const ADMIN_ROLES: Role[] = [Role.ADMIN, Role.SUPER_ADMIN];
const PAGE_SIZE = 50;

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: UserPayload, page: number) {
    if (!ADMIN_ROLES.includes(user.role as Role)) {
      throw new ForbiddenException('Solo administradores pueden ver el log de auditoría');
    }

    const skip = (page - 1) * PAGE_SIZE;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { user: { organizationId: user.organizationId } },
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: PAGE_SIZE,
      }),
      this.prisma.auditLog.count({
        where: { user: { organizationId: user.organizationId } },
      }),
    ]);

    return { data, total, page };
  }
}
