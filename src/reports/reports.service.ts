import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ownerWhere, isRestrictedUser, RequestUser } from '../common/scope.util';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async commissionsByPeriod(tenantId: string, from: string, to: string) {
    return this.prisma.commission.findMany({
      where: { tenantId, createdAt: { gte: new Date(from), lte: new Date(to) } },
      include: {
        seller: { select: { name: true } },
        partner: { select: { name: true } },
        saleItem: { include: { product: { select: { name: true } } } },
        sale: { include: { customer: { select: { companyName: true } } } },
        rule: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async commissionsBySeller(tenantId: string, from: string, to: string) {
    return this.prisma.commission.groupBy({
      by: ['sellerId'],
      where: { tenantId, sellerId: { not: null }, createdAt: { gte: new Date(from), lte: new Date(to) } },
      _sum: { amount: true },
      _count: true,
    });
  }

  async commissionsByProduct(tenantId: string, from: string, to: string) {
    // Exclui canceladas: quando uma venda e editada, as comissoes antigas sao
    // canceladas e perdem o vinculo com o item de venda (saleItemId fica null),
    // o que fazia elas aparecerem aqui como um produto fantasma "N/A".
    const items = await this.prisma.commission.findMany({
      where: { tenantId, status: { not: 'CANCELLED' }, createdAt: { gte: new Date(from), lte: new Date(to) } },
      include: { saleItem: { include: { product: { select: { id: true, name: true } } } } },
    });
    const map: Record<string, { productName: string; total: number; count: number }> = {};
    for (const c of items) {
      const pName = c.saleItem?.product?.name || 'N/A';
      const pId = c.saleItem?.product?.id || 'na';
      if (!map[pId]) map[pId] = { productName: pName, total: 0, count: 0 };
      map[pId].total += Number(c.amount);
      map[pId].count++;
    }
    return Object.values(map).sort((a, b) => b.total - a.total);
  }

  async ranking(tenantId: string, from?: string, to?: string) {
    const where: any = { tenantId, sellerId: { not: null } };
    if (from && to) {
      where.createdAt = { gte: new Date(from), lte: new Date(to) };
    }

    const bySellerRaw = await this.prisma.commission.groupBy({
      by: ['sellerId'],
      where,
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
    });

    const sellerIds = bySellerRaw.map((c) => c.sellerId).filter(Boolean) as string[];
    const sellers = await this.prisma.seller.findMany({
      where: { id: { in: sellerIds } },
      select: { id: true, name: true, team: true },
    });
    const sellerMap = new Map(sellers.map((s) => [s.id, s]));

    return bySellerRaw.map((c, i) => ({
      position: i + 1,
      sellerId: c.sellerId,
      sellerName: sellerMap.get(c.sellerId!)?.name || 'N/A',
      team: sellerMap.get(c.sellerId!)?.team || null,
      totalCommission: Number(c._sum.amount || 0),
      count: c._count,
    }));
  }

  async dashboardSummary(tenantId: string, user?: RequestUser) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const scope = ownerWhere(user);
    const restricted = isRestrictedUser(user);

    const [
      predicted,
      released,
      paid,
      salesThisMonth,
      topSellers,
      byStatus,
      mrrAgg,
      revenueThisMonthAgg,
      commissionsThisMonthAgg,
    ] = await Promise.all([
      this.prisma.commission.aggregate({
        where: { tenantId, status: 'PREDICTED', ...scope },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.commission.aggregate({
        where: { tenantId, status: 'RELEASED', ...scope },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.commission.aggregate({
        where: { tenantId, status: 'PAID', ...scope },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.sale.findMany({
        where: {
          tenantId,
          saleDate: { gte: monthStart },
          status: { not: 'CANCELLED' },
          ...scope,
        },
        include: {
          items: true,
          seller: { select: { name: true } },
          customer: { select: { companyName: true } },
        },
        orderBy: { saleDate: 'desc' },
        take: 10,
      }),
      restricted
        ? Promise.resolve([])
        : this.prisma.commission.groupBy({
            by: ['sellerId'],
            where: { tenantId, sellerId: { not: null } },
            _sum: { amount: true },
            _count: true,
            orderBy: { _sum: { amount: 'desc' } },
            take: 5,
          }),
      this.prisma.commission.groupBy({
        by: ['status'],
        where: { tenantId, ...scope },
        _sum: { amount: true },
        _count: true,
      }),
      // MRR: soma das mensalidades liquidas de vendas ativas
      this.prisma.saleItem.aggregate({
        where: {
          type: 'MONTHLY',
          sale: { tenantId, status: { notIn: ['CANCELLED', 'SUSPENDED'] }, ...scope },
        },
        _sum: { netValue: true },
      }),
      // Receita bruta de vendas fechadas este mes
      this.prisma.saleItem.aggregate({
        where: {
          sale: {
            tenantId,
            saleDate: { gte: monthStart },
            status: { not: 'CANCELLED' },
            ...scope,
          },
        },
        _sum: { grossValue: true },
      }),
      // Total de comissoes geradas este mes
      this.prisma.commission.aggregate({
        where: {
          tenantId,
          status: { not: 'CANCELLED' },
          createdAt: { gte: monthStart },
          ...scope,
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      predicted,
      released,
      paid,
      salesThisMonth,
      topSellers,
      byStatus,
      mrr: Number(mrrAgg._sum?.netValue || 0),
      revenueThisMonth: Number(revenueThisMonthAgg._sum?.grossValue || 0),
      commissionsThisMonth: Number(commissionsThisMonthAgg._sum?.amount || 0),
    };
  }

  async pendingPayments(tenantId: string) {
    return this.prisma.commission.findMany({
      where: { tenantId, status: 'RELEASED' },
      include: {
        seller: { select: { name: true } },
        partner: { select: { name: true } },
        saleItem: { include: { product: { select: { name: true } } } },
      },
      orderBy: { releasedAt: 'asc' },
    });
  }
}
