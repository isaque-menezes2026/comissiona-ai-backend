import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async commissionsByPeriod(tenantId: string, from: string, to: string) {
    return this.prisma.commission.findMany({
      where: { tenantId, createdAt: { gte: new Date(from), lte: new Date(to) } },
      include: {
        seller: { select: { name: true } }, partner: { select: { name: true } },
        saleItem: { include: { product: { select: { name: true } } } },
        sale: { include: { customer: { select: { companyName: true } } } }, rule: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async commissionsBySeller(tenantId: string, from: string, to: string) {
    return this.prisma.commission.groupBy({
      by: ['sellerId'],
      where: { tenantId, sellerId: { not: null }, createdAt: { gte: new Date(from), lte: new Date(to) } },
      _sum: { amount: true }, _count: true,
    });
  }

  async commissionsByProduct(tenantId: string, from: string, to: string) {
    const items = await this.prisma.commission.findMany({
      where: { tenantId, createdAt: { gte: new Date(from), lte: new Date(to) } },
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

  async dashboardSummary(tenantId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [predicted, released, paid, salesThisMonth, topSellers] = await Promise.all([
      this.prisma.commission.aggregate({ where: { tenantId, status: 'PREDICTED' }, _sum: { amount: true }, _count: true }),
      this.prisma.commission.aggregate({ where: { tenantId, status: 'RELEASED' }, _sum: { amount: true }, _count: true }),
      this.prisma.commission.aggregate({ where: { tenantId, status: 'PAID' }, _sum: { amount: true }, _count: true }),
      this.prisma.sale.findMany({ where: { tenantId, saleDate: { gte: monthStart }, status: { not: 'CANCELLED' } }, include: { items: true, seller: { select: { name: true } }, customer: { select: { companyName: true } } }, orderBy: { saleDate: 'desc' }, take: 10 }),
      this.prisma.commission.groupBy({ by: ['sellerId'], where: { tenantId, sellerId: { not: null } }, _sum: { amount: true }, _count: true, orderBy: { _sum: { amount: 'desc' } }, take: 5 }),
    ]);
    return { predicted, released, paid, salesThisMonth, topSellers };
  }

  async pendingPayments(tenantId: string) {
    return this.prisma.commission.findMany({
      where: { tenantId, status: 'RELEASED' },
      include: { seller: { select: { name: true } }, partner: { select: { name: true } }, saleItem: { include: { product: { select: { name: true } } } } },
      orderBy: { releasedAt: 'asc' },
    });
  }
}
