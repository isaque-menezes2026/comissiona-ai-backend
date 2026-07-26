import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ownerWhere, ownsRecord, isRestrictedUser, RequestUser } from '../common/scope.util';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, filters: any = {}, user?: RequestUser) {
    const where: any = { tenantId };
    if (filters.status) where.status = filters.status;
    if (filters.search) where.OR = [
      { companyName: { contains: filters.search, mode: 'insensitive' } },
      { tradeName: { contains: filters.search, mode: 'insensitive' } },
      { document: { contains: filters.search } },
    ];

    // Vendedor/parceiro/colaborador so enxergam os proprios clientes - admin,
    // gestor comercial e financeiro continuam vendo todos do tenant.
    if (isRestrictedUser(user)) {
      Object.assign(where, ownerWhere(user));
    } else if (filters.sellerId) {
      where.sellerId = filters.sellerId;
    }

    return this.prisma.customer.findMany({
      where,
      include: {
        seller: { select: { id: true, name: true } },
        partner: { select: { id: true, name: true } },
      },
      orderBy: { companyName: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string, user?: RequestUser) {
    const c = await this.prisma.customer.findFirst({
      where: { id, tenantId },
      include: {
        seller: true, partner: true, employee: true,
        sales: { include: { items: { include: { product: true } } }, orderBy: { saleDate: 'desc' } },
      },
    });
    if (!c) throw new NotFoundException('Cliente não encontrado');
    if (!ownsRecord(user, c)) throw new NotFoundException('Cliente não encontrado');
    return c;
  }

  async create(tenantId: string, dto: any) {
    return this.prisma.customer.create({ data: { ...dto, tenantId } });
  }

  async update(tenantId: string, id: string, dto: any) {
    await this.findOne(tenantId, id);
    return this.prisma.customer.update({ where: { id }, data: dto });
  }
}
