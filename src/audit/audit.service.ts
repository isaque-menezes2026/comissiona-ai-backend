import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

interface AuditLogDto {
  tenantId: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  previousData?: any;
  newData?: any;
  ipAddress?: string;
  metadata?: any;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(dto: AuditLogDto) {
    try {
      await this.prisma.auditLog.create({ data: dto });
    } catch (e) {
      console.error('[AUDIT] Falha ao registrar log:', e);
    }
  }

  async findByEntity(tenantId: string, entity: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { tenantId, entity, entityId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
