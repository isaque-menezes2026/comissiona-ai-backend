import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class GoalsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, month?: string) {
    return this.prisma.goal.findMany({
      where: { tenantId, ...(month ? { month } : {}) },
      include: { seller: { select: { id: true, name: true } } },
      orderBy: { month: 'desc' },
    });
  }

  async create(tenantId: string, dto: any) {
    return this.prisma.goal.create({ data: { ...dto, tenantId } });
  }

  async update(tenantId: string, id: string, dto: any) {
    return this.prisma.goal.update({ where: { id }, data: dto });
  }

  async getProgress(tenantId: string, month: string) {
    const goals = await this.findAll(tenantId, month);
    const start = new Date(`${month}-01`);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    return Promise.all(goals.map(async g => {
      let achieved = 0;
      if (g.type === 'revenue' || g.type === 'sales_count') {
        const agg = await this.prisma.sale.aggregate({
          where: { tenantId, sellerId: g.sellerId || undefined, saleDate: { gte: start, lte: end }, status: { not: 'CANCELLED' } },
          _count: true,
        });
        achieved = agg._count;
      }
      const pct = g.targetValue > 0 ? (achieved / Number(g.targetValue)) * 100 : 0;
      return { ...g, achieved, percentage: Math.min(pct, 100) };
    }));
  }
}
