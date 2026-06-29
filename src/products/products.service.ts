import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, includeInactive = false) {
    return this.prisma.product.findMany({
      where: { tenantId, ...(includeInactive ? {} : { active: true }), parentId: null },
      include: { modules: { where: includeInactive ? {} : { active: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const p = await this.prisma.product.findFirst({
      where: { id, tenantId },
      include: { modules: true, commissionRules: true },
    });
    if (!p) throw new NotFoundException('Produto não encontrado');
    return p;
  }

  async create(tenantId: string, dto: any) {
    return this.prisma.product.create({ data: { ...dto, tenantId } });
  }

  async update(tenantId: string, id: string, dto: any) {
    await this.findOne(tenantId, id);
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.product.update({ where: { id }, data: { active: false } });
  }
}
