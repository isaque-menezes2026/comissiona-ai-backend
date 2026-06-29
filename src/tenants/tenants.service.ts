import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: string) {
    const t = await this.prisma.tenant.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Empresa não encontrada');
    return t;
  }

  async update(id: string, data: any) {
    return this.prisma.tenant.update({ where: { id }, data });
  }

  async getUsers(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: { id: true, name: true, email: true, role: true, active: true, lastLoginAt: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
  }

  async createUser(tenantId: string, dto: any) {
    const hash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: { tenantId, name: dto.name, email: dto.email, passwordHash: hash, role: dto.role || 'SELLER' },
      select: { id: true, name: true, email: true, role: true },
    });
  }

  async getDashboardStats(tenantId: string) {
    const [sellers, partners, customers, salesActive, commissionsTotal] = await Promise.all([
      this.prisma.seller.count({ where: { tenantId, active: true } }),
      this.prisma.partner.count({ where: { tenantId, active: true } }),
      this.prisma.customer.count({ where: { tenantId, active: true } }),
      this.prisma.sale.count({ where: { tenantId, status: { in: ['ACTIVE', 'CONTRACT_SIGNED', 'IN_IMPLEMENTATION'] } } }),
      this.prisma.commission.aggregate({ where: { tenantId }, _sum: { amount: true }, _count: true }),
    ]);
    const byStatus = await this.prisma.commission.groupBy({
      by: ['status'], where: { tenantId }, _sum: { amount: true }, _count: true,
    });
    return { sellers, partners, customers, salesActive, commissionsTotal, byStatus };
  }
}
