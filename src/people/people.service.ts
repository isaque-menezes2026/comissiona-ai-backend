import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
  // Exclusão só permitida se o vendedor não tiver nenhuma venda associada.
  async removeSeller(tenantId: string, id: string) {
    const count = await this.prisma.sale.count({ where: { tenantId, sellerId: id } });
    if (count > 0) {
      throw new BadRequestException(
        'Este vendedor possui vendas associadas e não pode ser excluído. Marque como "Inativo" em vez de excluir.',
      );
    }
    await this.prisma.seller.delete({ where: { id } });
    return { message: 'Vendedor excluído com sucesso.' };
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
  // Exclusão só permitida se o parceiro não tiver nenhuma venda associada.
  async removePartner(tenantId: string, id: string) {
    const count = await this.prisma.sale.count({ where: { tenantId, partnerId: id } });
    if (count > 0) {
      throw new BadRequestException(
        'Este parceiro possui vendas associadas e não pode ser excluído. Marque como "Inativo" em vez de excluir.',
      );
    }
    await this.prisma.partner.delete({ where: { id } });
    return { message: 'Parceiro excluído com sucesso.' };
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
  // Exclusão só permitida se o colaborador não tiver nenhuma venda associada.
  async removeEmployee(tenantId: string, id: string) {
    const count = await this.prisma.sale.count({ where: { tenantId, employeeId: id } });
    if (count > 0) {
      throw new BadRequestException(
        'Este colaborador possui vendas associadas e não pode ser excluído. Marque como "Inativo" em vez de excluir.',
      );
    }
    await this.prisma.employee.delete({ where: { id } });
    return { message: 'Colaborador excluído com sucesso.' };
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
