import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CommissionEngineService } from '../commission-engine/commission-engine.service';

@Injectable()
export class CommissionsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private engine: CommissionEngineService,
  ) {}

  async findAll(tenantId: string, filters: any = {}) {
    const where: any = { tenantId };
    if (filters.status) where.status = filters.status;
    if (filters.sellerId) where.sellerId = filters.sellerId;
    if (filters.month) where.expectedPaymentCompetence = filters.month;
    return this.prisma.commission.findMany({
      where,
      include: {
        sale: { include: { customer: { select: { id: true, companyName: true } } } },
        saleItem: { include: { product: { select: { id: true, name: true } } } },
        seller: { select: { id: true, name: true } },
        partner: { select: { id: true, name: true } },
        rule: { select: { id: true, name: true, commissionType: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const c = await this.prisma.commission.findFirst({
      where: { id, tenantId },
      include: { sale: { include: { customer: true, seller: true } }, saleItem: { include: { product: true } }, seller: true, partner: true, rule: true },
    });
    if (!c) throw new NotFoundException('Comissao nao encontrada');
    return c;
  }

  async findMySummary(tenantId: string, sellerId: string) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const [predicted, released, paid, thisMonth] = await Promise.all([
      this.prisma.commission.aggregate({ where: { tenantId, sellerId, status: 'PREDICTED' }, _sum: { amount: true }, _count: true }),
      this.prisma.commission.aggregate({ where: { tenantId, sellerId, status: 'RELEASED' }, _sum: { amount: true }, _count: true }),
      this.prisma.commission.aggregate({ where: { tenantId, sellerId, status: 'PAID' }, _sum: { amount: true }, _count: true }),
      this.prisma.commission.aggregate({ where: { tenantId, sellerId, expectedPaymentCompetence: currentMonth }, _sum: { amount: true } }),
    ]);
    const recent = await this.prisma.commission.findMany({
      where: { tenantId, sellerId },
      include: { saleItem: { include: { product: { select: { name: true } } } }, sale: { include: { customer: { select: { companyName: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    return { predicted, released, paid, thisMonth, recent };
  }

  async cancel(tenantId: string, id: string, reason: string, userId: string) {
    const c = await this.findOne(tenantId, id);
    const updated = await this.prisma.commission.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason, forecastStatus: 'cancelled' },
    });
    await this.audit.log({ tenantId, userId, action: 'STATUS_CHANGE', entity: 'commission', entityId: id, previousData: { status: c.status }, newData: { status: 'CANCELLED', reason } });
    return updated;
  }

  async processInvoice(tenantId: string, dto: { saleId: string; installmentNum: number; paidAmount: number; paidAt?: string }, userId: string) {
    await this.prisma.invoice.updateMany({
      where: { tenantId, saleId: dto.saleId, installmentNum: dto.installmentNum },
      data: { status: 'PAID', paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(), paidAmount: dto.paidAmount },
    });
    await this.engine.processInvoicePaid(tenantId, dto.saleId, dto.installmentNum, userId);
    return { message: 'Parcela ' + dto.installmentNum + ' processada com sucesso' };
  }

  // Marca uma ou mais comissões diretamente como PAGA, sem passar pelo fluxo de fatura/parcela.
  // Ignora silenciosamente ids que já estão PAID/CANCELLED (não elegíveis).
  async markPaid(tenantId: string, ids: string[], userId: string) {
    if (!ids || ids.length === 0) {
      return { message: 'Nenhuma comissão selecionada.', count: 0 };
    }

    const commissions = await this.prisma.commission.findMany({
      where: { tenantId, id: { in: ids } },
    });
    const eligibleIds = commissions
      .filter((c) => c.status !== 'PAID' && c.status !== 'CANCELLED')
      .map((c) => c.id);

    if (eligibleIds.length === 0) {
      return { message: 'Nenhuma das comissões selecionadas é elegível para pagamento.', count: 0 };
    }

    await this.prisma.commission.updateMany({
      where: { tenantId, id: { in: eligibleIds } },
      data: { status: 'PAID', paidAt: new Date() },
    });

    await this.audit.log({
      tenantId,
      userId,
      action: 'COMMISSIONS_MARKED_PAID',
      entity: 'commission',
      metadata: { ids: eligibleIds, count: eligibleIds.length },
    });

    return { message: `${eligibleIds.length} comissão(ões) marcada(s) como paga(s).`, count: eligibleIds.length };
  }
}
