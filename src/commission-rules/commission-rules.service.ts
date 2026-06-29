import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class CommissionRulesService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async findAll(tenantId: string) {
    return this.prisma.commissionRule.findMany({
      where: { tenantId },
      include: { product: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const r = await this.prisma.commissionRule.findFirst({ where: { id, tenantId }, include: { product: true } });
    if (!r) throw new NotFoundException('Regra não encontrada');
    return r;
  }

  async create(tenantId: string, dto: any, userId: string) {
    const rule = await this.prisma.commissionRule.create({ data: { ...dto, tenantId } });
    await this.audit.log({ tenantId, userId, action: 'CREATE', entity: 'commission_rule', entityId: rule.id, newData: dto });
    return rule;
  }

  async update(tenantId: string, id: string, dto: any, userId: string) {
    const prev = await this.findOne(tenantId, id);
    const rule = await this.prisma.commissionRule.update({ where: { id }, data: dto });
    await this.audit.log({ tenantId, userId, action: 'UPDATE', entity: 'commission_rule', entityId: id, previousData: prev, newData: dto });
    return rule;
  }

  async remove(tenantId: string, id: string, userId: string) {
    await this.findOne(tenantId, id);
    const rule = await this.prisma.commissionRule.update({ where: { id }, data: { active: false } });
    await this.audit.log({ tenantId, userId, action: 'DELETE', entity: 'commission_rule', entityId: id });
    return rule;
  }
}
