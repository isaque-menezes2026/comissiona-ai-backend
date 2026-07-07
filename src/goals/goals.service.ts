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

// Gera os N periodKeys anteriores (incluindo o atual), do mais antigo pro mais
// recente, para montar a evolução histórica de uma meta por período.
function previousPeriodKeys(periodType: string, periodKey: string, count: number): string[] {
  const keys: string[] = [];
  if (periodType === 'monthly') {
    let [y, m] = periodKey.split('-').map(Number);
    for (let i = count - 1; i >= 0; i--) {
      let yy = y, mm = m - i;
      while (mm < 1) { mm += 12; yy -= 1; }
      keys.push(`${yy}-${String(mm).padStart(2, '0')}`);
    }
    return keys;
  }
  if (periodType === 'yearly') {
    const y = Number(periodKey);
    for (let i = count - 1; i >= 0; i--) keys.push(`${y - i}`);
    return keys;
  }
  if (periodType === 'quarterly') {
    let [y, q] = periodKey.split('-Q').map(Number);
    for (let i = count - 1; i >= 0; i--) {
      let yy = y, qq = q - i;
      while (qq < 1) { qq += 4; yy -= 1; }
      keys.push(`${yy}-Q${qq}`);
    }
    return keys;
  }
  if (periodType === 'semiannual') {
    let [y, h] = periodKey.split('-H').map(Number);
    for (let i = count - 1; i >= 0; i--) {
      let yy = y, hh = h - i;
      while (hh < 1) { hh += 2; yy -= 1; }
      keys.push(`${yy}-H${hh}`);
    }
    return keys;
  }
  if (periodType === 'weekly') {
    const [y, w] = periodKey.replace('W', '-').split('-').map(Number);
    for (let i = count - 1; i >= 0; i--) {
      let ww = w - i;
      // Simplificação: não cruza virada de ano dentro da janela pedida.
      if (ww < 1) ww = 1;
      keys.push(`${y}-W${ww}`);
    }
    return keys;
  }
  return [periodKey];
}

// Lista os periodKeys mensais ('YYYY-MM') contidos num intervalo de datas —
// usado para compor trimestre/semestre/ano a partir das metas mensais.
function monthlyKeysInRange(start: Date, end: Date): string[] {
  const keys: string[] = [];
  let y = start.getFullYear();
  let m = start.getMonth();
  const endY = end.getFullYear();
  const endM = end.getMonth();
  while (y < endY || (y === endY && m <= endM)) {
    keys.push(`${y}-${String(m + 1).padStart(2, '0')}`);
    m++;
    if (m > 11) { m = 0; y++; }
  }
  return keys;
}

@Injectable()
export class GoalsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, filters: { periodType?: string; periodKey?: string; productId?: string; includeInactive?: boolean } = {}) {
    const where: any = { tenantId };
    if (filters.periodType) where.periodType = filters.periodType;
    if (filters.periodKey) where.periodKey = filters.periodKey;
    if (filters.productId) where.productId = filters.productId;
    if (!filters.includeInactive) where.active = true;
    return this.prisma.goal.findMany({
      where,
      include: {
        seller: { select: { id: true, name: true } },
        product: { select: { id: true, name: true, color: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Desativa metas existentes que ocupam o mesmo "slot" (mesmo produto,
  // vendedor, tipo de período e período) antes de criar/mover uma nova meta
  // para lá — evita duplicidade de metas ativas para o mesmo escopo.
  private async deactivateConflicting(tenantId: string, dto: any, excludeId?: string) {
    const where: any = {
      tenantId,
      active: true,
      periodType: dto.periodType,
      periodKey: dto.periodKey,
      productId: dto.productId || null,
      sellerId: dto.sellerId || null,
    };
    if (excludeId) where.id = { not: excludeId };
    await this.prisma.goal.updateMany({ where, data: { active: false } });
  }

  async create(tenantId: string, dto: any) {
    if (dto.active !== false) {
      await this.deactivateConflicting(tenantId, dto);
    }
    return this.prisma.goal.create({
      data: {
        ...dto,
        tenantId,
        active: dto.active !== false,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    const data: any = { ...dto };
    if (dto.startDate !== undefined) data.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.endDate !== undefined) data.endDate = dto.endDate ? new Date(dto.endDate) : null;

    // Se a edição move a meta pra outro produto/período/vendedor (ou a
    // reativa), desativa qualquer outra meta que já ocupe esse slot.
    if (dto.active !== false && (dto.periodType || dto.periodKey || dto.productId !== undefined || dto.sellerId !== undefined)) {
      const current = await this.prisma.goal.findUnique({ where: { id } });
      if (current) {
        await this.deactivateConflicting(tenantId, {
          periodType: dto.periodType ?? current.periodType,
          periodKey: dto.periodKey ?? current.periodKey,
          productId: dto.productId !== undefined ? dto.productId : current.productId,
          sellerId: dto.sellerId !== undefined ? dto.sellerId : current.sellerId,
        }, id);
      }
    }

    return this.prisma.goal.update({ where: { id }, data });
  }

  async remove(tenantId: string, id: string) {
    return this.prisma.goal.delete({ where: { id } });
  }

  // Duplica uma meta existente para vários períodos de destino de uma vez
  // (ex: replicar a meta de julho para agosto, setembro e outubro), evitando
  // que o usuário precise recriar manualmente mês a mês. Cada período de
  // destino segue a mesma regra de "inativar conflitante" do create/update.
  async duplicate(tenantId: string, id: string, periodKeys: string[]) {
    const source = await this.prisma.goal.findFirst({ where: { id, tenantId } });
    if (!source) throw new Error('Meta de origem não encontrada.');

    const targets = [...new Set(periodKeys)].filter(pk => pk && pk !== source.periodKey);
    const created = [];
    for (const periodKey of targets) {
      await this.deactivateConflicting(tenantId, {
        periodType: source.periodType,
        periodKey,
        productId: source.productId,
        sellerId: source.sellerId,
      });
      const goal = await this.prisma.goal.create({
        data: {
          tenantId,
          productId: source.productId,
          sellerId: source.sellerId,
          teamName: source.teamName,
          periodType: source.periodType,
          periodKey,
          type: source.type,
          targetValue: source.targetValue,
          bonusAmount: source.bonusAmount,
          bonusPercentage: source.bonusPercentage,
          startDate: source.startDate,
          endDate: source.endDate,
          notes: source.notes,
          active: true,
        },
      });
      created.push(goal);
    }
    return { count: created.length, goals: created };
  }

  private async computeAchieved(tenantId: string, g: { productId?: string | null; sellerId?: string | null; type: string }, start: Date, end: Date) {
    const saleItemWhere: any = {
      sale: { tenantId, saleDate: { gte: start, lte: end }, status: { not: 'CANCELLED' } },
    };
    if (g.productId) saleItemWhere.productId = g.productId;
    if (g.sellerId) saleItemWhere.sale.sellerId = g.sellerId;

    if (g.type === 'quantity') {
      return this.prisma.saleItem.count({ where: saleItemWhere });
    }
    const agg = await this.prisma.saleItem.aggregate({ where: saleItemWhere, _sum: { grossValue: true } });
    return Number(agg._sum?.grossValue || 0);
  }

  // Metas trimestrais/semestrais/anuais que não foram definidas manualmente
  // são "compostas" ao vivo somando as metas mensais (mesmo produto/vendedor)
  // que caem dentro do período — sem duplicar nada no banco. Se existir uma
  // meta explícita para aquele produto/vendedor no período maior, ela vale
  // (a composição automática só entra como substituto, não sobrepõe).
  private async getComposedGoals(tenantId: string, periodType: string, periodKey: string, explicitGoals: any[]) {
    if (!['quarterly', 'semiannual', 'yearly'].includes(periodType)) return [];

    const { start, end } = getPeriodRange(periodType, periodKey);
    const monthKeys = monthlyKeysInRange(start, end);

    const monthlyGoals = await this.prisma.goal.findMany({
      where: { tenantId, periodType: 'monthly', periodKey: { in: monthKeys }, active: true },
      include: {
        seller: { select: { id: true, name: true } },
        product: { select: { id: true, name: true, color: true } },
      },
    });

    const explicitSlots = new Set(explicitGoals.map(g => `${g.productId || 'null'}|${g.sellerId || 'null'}|${g.type}`));
    const groups = new Map<string, any[]>();
    for (const mg of monthlyGoals) {
      const slot = `${mg.productId || 'null'}|${mg.sellerId || 'null'}|${mg.type}`;
      if (explicitSlots.has(slot)) continue; // meta manual já cobre esse slot
      if (!groups.has(slot)) groups.set(slot, []);
      groups.get(slot)!.push(mg);
    }

    const now = new Date();
    return Promise.all([...groups.entries()].map(async ([slot, monthGoals]) => {
      const sample = monthGoals[0];
      const targetValue = monthGoals.reduce((sum, m) => sum + Number(m.targetValue), 0);
      const achieved = await this.computeAchieved(tenantId, sample, start, end);
      const pct = targetValue > 0 ? (achieved / targetValue) * 100 : 0;
      return {
        id: `composed-${slot}-${periodKey}`,
        tenantId,
        productId: sample.productId,
        product: sample.product,
        sellerId: sample.sellerId,
        seller: sample.seller,
        teamName: sample.teamName,
        periodType,
        periodKey,
        type: sample.type,
        targetValue,
        achievedValue: 0,
        bonusAmount: null,
        bonusPercentage: null,
        startDate: null,
        endDate: null,
        active: true,
        notes: null,
        createdAt: now,
        updatedAt: now,
        achieved,
        percentage: Math.min(pct, 999),
        isValid: true,
        isComposed: true,
        composedFromMonths: monthGoals.length,
        composedTotalMonths: monthKeys.length,
      };
    }));
  }

  async getProgress(tenantId: string, periodType: string, periodKey: string) {
    const goals = await this.findAll(tenantId, { periodType, periodKey });
    const { start, end } = getPeriodRange(periodType, periodKey);
    const now = new Date();

    const explicitResults = await Promise.all(goals.map(async g => {
      const isValid = (!g.startDate || g.startDate <= now) && (!g.endDate || g.endDate >= now);
      const achieved = await this.computeAchieved(tenantId, g, start, end);
      const pct = Number(g.targetValue) > 0 ? (achieved / Number(g.targetValue)) * 100 : 0;
      return { ...g, achieved, percentage: Math.min(pct, 999), isValid };
    }));

    const composedResults = await this.getComposedGoals(tenantId, periodType, periodKey, goals);
    return [...explicitResults, ...composedResults];
  }

  // Evolução: retorna o percentual atingido nos últimos N períodos do mesmo
  // tipo, para o produto/vendedor indicado — inclui metas já inativadas,
  // pra não perder o histórico quando uma meta é substituída por outra.
  async getHistory(tenantId: string, params: { periodType: string; periodKey: string; productId?: string; sellerId?: string; count?: number }) {
    const count = params.count && params.count > 0 ? params.count : 6;
    const keys = previousPeriodKeys(params.periodType, params.periodKey, count);

    return Promise.all(keys.map(async periodKey => {
      const where: any = { tenantId, periodType: params.periodType, periodKey };
      if (params.productId) where.productId = params.productId;
      else where.productId = null;
      if (params.sellerId) where.sellerId = params.sellerId;

      const goal = await this.prisma.goal.findFirst({ where, orderBy: { createdAt: 'desc' } });
      if (!goal) return { periodKey, hasGoal: false, achieved: 0, targetValue: 0, percentage: 0 };

      const { start, end } = getPeriodRange(params.periodType, periodKey);
      const saleItemWhere: any = {
        sale: { tenantId, saleDate: { gte: start, lte: end }, status: { not: 'CANCELLED' } },
      };
      if (goal.productId) saleItemWhere.productId = goal.productId;
      if (goal.sellerId) saleItemWhere.sale.sellerId = goal.sellerId;

      let achieved = 0;
      if (goal.type === 'quantity') {
        achieved = await this.prisma.saleItem.count({ where: saleItemWhere });
      } else {
        const agg = await this.prisma.saleItem.aggregate({ where: saleItemWhere, _sum: { grossValue: true } });
        achieved = Number(agg._sum?.grossValue || 0);
      }

      const target = Number(goal.targetValue);
      const percentage = target > 0 ? Math.min((achieved / target) * 100, 999) : 0;
      return { periodKey, hasGoal: true, achieved, targetValue: target, percentage, active: goal.active };
    }));
  }
}
