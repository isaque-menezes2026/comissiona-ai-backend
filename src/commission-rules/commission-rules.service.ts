import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

// Campos de cadastro que podem ser criados/editados numa regra. Tudo que vier a
// mais do cliente (id, tenantId, createdAt, product, commissions...) é ignorado —
// evita quebra do Prisma e adulteração de tenant.
const ALLOWED_FIELDS = [
  'name', 'description', 'productId', 'productCategory', 'saleOrigin',
  'beneficiaryType', 'commissionType', 'percentage', 'fixedAmount',
  'triggerEvent', 'installmentNumber', 'appliesAfterDays', 'appliesOnNetAmount',
  'requiresCustomerActive', 'requiresInvoicePaid', 'requiresManagerApproval',
  'active', 'startDate', 'endDate',
];

@Injectable()
export class CommissionRulesService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  // Pega só os campos permitidos e normaliza datas/números (o front manda strings).
  private sanitize(dto: any): any {
    const data: Record<string, any> = {};
    for (const key of ALLOWED_FIELDS) {
      if (dto[key] !== undefined) data[key] = dto[key];
    }
    // Vigência: string vazia/null => null; senão vira Date.
    for (const dateKey of ['startDate', 'endDate']) {
      if (dateKey in data) data[dateKey] = data[dateKey] ? new Date(data[dateKey]) : null;
    }
    // Numéricos: string vazia => null; senão Number.
    for (const numKey of ['percentage', 'fixedAmount', 'appliesAfterDays', 'installmentNumber']) {
      if (numKey in data) {
        const v = data[numKey];
        data[numKey] = v === '' || v === null || v === undefined ? null : Number(v);
        if (data[numKey] !== null && Number.isNaN(data[numKey])) data[numKey] = null;
      }
    }
    return data;
  }

  // Snapshot enxuto pro histórico (sem a relação product, que é objeto grande).
  private snapshot(rule: any): Record<string, any> {
    if (!rule) return rule;
    const { product, tenant, commissions, ...rest } = rule;
    return rest;
  }

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
    const data = this.sanitize(dto);
    const rule = await this.prisma.commissionRule.create({ data: { ...data, tenantId } });
    await this.audit.log({ tenantId, userId, action: 'CREATE', entity: 'commission_rule', entityId: rule.id, newData: this.snapshot(rule) });
    return rule;
  }

  async update(tenantId: string, id: string, dto: any, userId: string) {
    const prev = await this.findOne(tenantId, id);
    const data = this.sanitize(dto);
    const rule = await this.prisma.commissionRule.update({ where: { id }, data });
    await this.audit.log({
      tenantId, userId, action: 'UPDATE', entity: 'commission_rule', entityId: id,
      previousData: this.snapshot(prev), newData: this.snapshot(rule),
    });
    return rule;
  }

  async remove(tenantId: string, id: string, userId: string) {
    const prev = await this.findOne(tenantId, id);
    // Desativação (soft): não apaga histórico nem comissões já geradas pela regra.
    const rule = await this.prisma.commissionRule.update({ where: { id }, data: { active: false } });
    await this.audit.log({
      tenantId, userId, action: 'DELETE', entity: 'commission_rule', entityId: id,
      previousData: this.snapshot(prev), newData: this.snapshot(rule),
    });
    return rule;
  }

  // Histórico de alterações da regra (lê os audit_logs da entidade). Valida antes
  // que a regra é do tenant, pra não vazar histórico de outro tenant.
  async getHistory(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.audit.findByEntity(tenantId, 'commission_rule', id);
  }
}
