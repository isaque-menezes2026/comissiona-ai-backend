import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class PeopleService {
  constructor(private prisma: PrismaService) {}

  async findAllSellers(tenantId: string) {
    return this.prisma.seller.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }
  async createSeller(tenantId: string, dto: any) {
    return this.prisma.seller.create({ data: { ...dto, tenantId } });
  }
  async updateSeller(tenantId: string, id: string, dto: any) {
    return this.prisma.seller.update({ where: { id }, data: dto });
  }

  async findAllPartners(tenantId: string) {
    return this.prisma.partner.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }
  async createPartner(tenantId: string, dto: any) {
    return this.prisma.partner.create({ data: { ...dto, tenantId } });
  }
  async updatePartner(tenantId: string, id: string, dto: any) {
    return this.prisma.partner.update({ where: { id }, data: dto });
  }

  async findAllEmployees(tenantId: string) {
    return this.prisma.employee.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }
  async createEmployee(tenantId: string, dto: any) {
    return this.prisma.employee.create({ data: { ...dto, tenantId } });
  }
  async updateEmployee(tenantId: string, id: string, dto: any) {
    return this.prisma.employee.update({ where: { id }, data: dto });
  }

  async getRanking(tenantId: string, month: string) {
    const start = new Date(`${month}-01`);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    const sales = await this.prisma.sale.groupBy({
      by: ['sellerId'],
      where: { tenantId, saleDate: { gte: start, lte: end } },
      _count: true,
    });
    const commissions = await this.prisma.commission.groupBy({
      by: ['sellerId'],
      where: { tenantId, createdAt: { gte: start, lte: end }, sellerId: { not: null } },
      _sum: { amount: true },
    });
    const sellers = await this.prisma.seller.findMany({ where: { tenantId, active: true } });
    return sellers.map(s => ({
      seller: s,
      salesCount: sales.find(x => x.sellerId === s.id)?._count || 0,
      totalCommission: Number(commissions.find(x => x.sellerId === s.id)?._sum?.amount || 0),
    })).sort((a, b) => b.totalCommission - a.totalCommission).map((x, i) => ({ ...x, rank: i + 1 }));
  }

  async findAllUsers(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: { id: true, name: true, email: true, role: true, active: true, lastLoginAt: true },
      orderBy: { name: 'asc' },
    });
  }

  async resetUserPassword(tenantId: string, userId: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, tenantId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    const hash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
    return { message: 'Senha redefinida com sucesso' };
  }
}
