import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

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
    // Exclui canceladas: quando uma venda é editada, as comissões antigas são
    // canceladas e perdem o vínculo com o item de venda (saleItemId fica null),
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

  async dashboardSummary(tenantId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

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
        where: { tenantId, status: 'PREDICTED' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.commission.aggregate({
        where: { tenantId, status: 'RELEASED' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.commission.aggregate({
        where: { tenantId, status: 'PAID' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.sale.findMany({
        where: {
          tenantId,
          saleDate: { gte: monthStart },
          status: { not: 'CANCELLED' },
        },
        include: {
          items: true,
          seller: { select: { name: true } },
          customer: { select: { companyName: true } },
        },
        orderBy: { saleDate: 'desc' },
        take: 10,
      }),
      this.prisma.commission.groupBy({
        by: ['sellerId'],
        where: { tenantId, sellerId: { not: null } },
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: 'desc' } },
        take: 5,
      }),
      this.prisma.commission.groupBy({
        by: ['status'],
        where: { tenantId },
        _sum: { amount: true },
        _count: true,
      }),
      // MRR: soma das mensalidades líquidas de vendas ativas
      this.prisma.saleItem.aggregate({
        where: {
          type: 'MONTHLY',
          sale: { tenantId, status: { notIn: ['CANCELLED', 'SUSPENDED'] } },
        },
        _sum: { netValue: true },
      }),
      // Receita bruta de vendas fechadas este mês
      this.prisma.saleItem.aggregate({
        where: {
          sale: {
            tenantId,
            saleDate: { gte: monthStart },
            status: { not: 'CANCELLED' },
          },
        },
        _sum: { grossValue: true },
      }),
      // Total de comissões geradas este mês
      this.prisma.commission.aggregate({
        where: {
          tenantId,
          status: { not: 'CANCELLED' },
          createdAt: { gte: monthStart },
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
