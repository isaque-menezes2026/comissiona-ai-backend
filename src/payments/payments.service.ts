import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async findAllBatches(tenantId: string, filters: any = {}) {
    const where: any = { tenantId };
    if (filters.status) where.status = filters.status;
    if (filters.competence) where.competence = filters.competence;
    return this.prisma.paymentBatch.findMany({
      where, include: { items: { include: { commission: { include: { seller: { select: { name: true } }, partner: { select: { name: true } } } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createBatch(tenantId: string, dto: { competence: string; commissionIds: string[] }, userId: string) {
    const commissions = await this.prisma.commission.findMany({
      where: { tenantId, id: { in: dto.commissionIds }, status: 'RELEASED' },
      include: { seller: true, partner: true, employee: true },
    });
    if (!commissions.length) throw new Error('Nenhuma comissao liberada encontrada');

    const total = commissions.reduce((s, c) => s + Number(c.amount), 0);
    const batch = await this.prisma.paymentBatch.create({
      data: {
        tenantId, competence: dto.competence, status: 'OPEN',
        totalGross: total, totalNet: total, createdById: userId,
        items: {
          create: commissions.map(c => ({
            commissionId: c.id,
            beneficiaryType: c.beneficiaryType,
            beneficiaryId: c.beneficiaryId,
            beneficiaryName: c.seller?.name || c.partner?.name || c.employee?.name || 'N/A',
            grossValue: c.amount,
            netValue: c.amount,
            pixKey: c.partner?.pixKey || null,
          })),
        },
      },
      include: { items: true },
    });

    await this.audit.log({ tenantId, userId, action: 'CREATE', entity: 'payment_batch', entityId: batch.id, newData: dto });
    return batch;
  }

  async approveBatch(tenantId: string, id: string, userId: string) {
    const batch = await this.prisma.paymentBatch.findFirst({ where: { id, tenantId } });
    if (!batch) throw new NotFoundException('Lote nao encontrado');
    const updated = await this.prisma.paymentBatch.update({
      where: { id }, data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
    });
    await this.audit.log({ tenantId, userId, action: 'STATUS_CHANGE', entity: 'payment_batch', entityId: id, newData: { status: 'APPROVED' } });
    return updated;
  }

  async markAsPaid(tenantId: string, id: string, userId: string) {
    const batch = await this.prisma.paymentBatch.findFirst({ where: { id, tenantId } });
    if (!batch) throw new NotFoundException('Lote nao encontrado');
    await this.prisma.paymentBatch.update({ where: { id }, data: { status: 'PAID', paidAt: new Date() } });
    const items = await this.prisma.paymentItem.findMany({ where: { batchId: id } });
    await this.prisma.commission.updateMany({
      where: { id: { in: items.map(i => i.commissionId) } },
      data: { status: 'PAID', paidAt: new Date(), forecastStatus: 'paid' },
    });
    await this.audit.log({ tenantId, userId, action: 'STATUS_CHANGE', entity: 'payment_batch', entityId: id, newData: { status: 'PAID' } });
    return { message: 'Lote marcado como pago' };
  }

  async getReleasedCommissions(tenantId: string) {
    return this.prisma.commission.findMany({
      where: { tenantId, status: 'RELEASED' },
      include: {
        seller: { select: { id: true, name: true } },
        partner: { select: { id: true, name: true } },
        sale: { include: { customer: { select: { companyName: true } } } },
        saleItem: { include: { product: { select: { name: true } } } },
        rule: { select: { name: true } },
      },
      orderBy: { releasedAt: 'desc' },
    });
  }
}
