import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

function getPeriodRange(periodType: string, periodKey: string): { start: Date; end: Date } {
  if (periodType === 'monthly') {
    const start = new Date(`${periodKey}-01`);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
    return { start, end };
  }
  if (periodType === 'weekly') {
    const [year, week] = periodKey.replace('W', '-').split('-').map(Number);
    const jan4 = new Date(year, 0, 4);
    const dayOfWeek = jan4.getDay() || 7;
    const week1Monday = new Date(jan4);
    week1Monday.setDate(jan4.getDate() - dayOfWeek + 1);
    const start = new Date(week1Monday);
    start.setDate(week1Monday.getDate() + (week - 1) * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59);
    return { start, end };
  }
  if (periodType === 'quarterly') {
    const [year, q] = periodKey.split('-Q').map(Number);
    const startMonth = (q - 1) * 3;
    const start = new Date(year, startMonth, 1);
    const end = new Date(year, startMonth + 3, 0, 23, 59, 59);
    return { start, end };
  }
  if (periodType === 'semiannual') {
    const [year, h] = periodKey.split('-H').map(Number);
    const startMonth = h === 1 ? 0 : 6;
    const start = new Date(year, startMonth, 1);
    const end = new Date(year, startMonth + 6, 0, 23, 59, 59);
    return { start, end };
  }
  if (periodType === 'yearly') {
    const year = Number(periodKey);
    return { start: new Date(year, 0, 1), end: new Date(year, 11, 31, 23, 59, 59) };
  }
  const start = new Date(`${periodKey}-01`);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
  return { start, end };
}

@Injectable()
export class GoalsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, filters: { periodType?: string; periodKey?: string; productId?: string } = {}) {
    const where: any = { tenantId };
    if (filters.periodType) where.periodType = filters.periodType;
    if (filters.periodKey) where.periodKey = filters.periodKey;
    if (filters.productId) where.productId = filters.productId;
    return this.prisma.goal.findMany({
      where,
      include: {
        seller: { select: { id: true, name: true } },
        product: { select: { id: true, name: true, color: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(tenantId: string, dto: any) {
    return this.prisma.goal.create({ data: { ...dto, tenantId } });
  }

  async update(tenantId: string, id: string, dto: any) {
    return this.prisma.goal.update({ where: { id }, data: dto });
  }

  async remove(tenantId: string, id: string) {
    return this.prisma.goal.delete({ where: { id } });
  }

  async getProgress(tenantId: string, periodType: string, periodKey: string) {
    const goals = await this.findAll(tenantId, { periodType, periodKey });
    const { start, end } = getPeriodRange(periodType, periodKey);

    return Promise.all(goals.map(async g => {
      let achieved = 0;

      const saleItemWhere: any = {
        sale: { tenantId, saleDate: { gte: start, lte: end }, status: { not: 'CANCELLED' } },
      };
      if (g.productId) saleItemWhere.productId = g.productId;

      const agg = await this.prisma.saleItem.aggregate({
        where: saleItemWhere,
        _sum: { grossValue: true },
      });
      achieved = Number(agg._sum?.grossValue || 0);

      const pct = Number(g.targetValue) > 0 ? (achieved / Number(g.targetValue)) * 100 : 0;
      return { ...g, achieved, percentage: Math.min(pct, 999) };
    }));
  }
}
