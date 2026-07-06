import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, filters: any = {}) {
    const where: any = { tenantId };
    if (filters.status) where.status = filters.status;
    if (filters.sellerId) where.sellerId = filters.sellerId;
    if (filters.search) where.OR = [
      { companyName: { contains: filters.search, mode: 'insensitive' } },
      { tradeName: { contains: filters.search, mode: 'insensitive' } },
      { document: { contains: filters.search } },
    ];
    return this.prisma.customer.findMany({
      where,
      include: {
        seller: { select: { id: true, name: true } },
        partner: { select: { id: true, name: true } },
      },
      orderBy: { companyName: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const c = await this.prisma.customer.findFirst({
      where: { id, tenantId },
      include: {
        seller: true, partner: true, employee: true,
        sales: { include: { items: { include: { product: true } } }, orderBy: { saleDate: 'desc' } },
      },
    });
    if (!c) throw new NotFoundException('Cliente não encontrado');
    return c;
  }

  async create(tenantId: string, dto: any) {
    return this.prisma.customer.create({ data: { ...dto, tenantId } });
  }

  async update(tenantId: string, id: string, dto: any) {
    await this.findOne(tenantId, id);
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  // Exclusão só é permitida se o cliente não tiver nenhuma venda associada.
  // Caso contrário, orienta a inativar (status = 'inactive') em vez de excluir.
  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    const salesCount = await this.prisma.sale.count({ where: { tenantId, customerId: id } });
    if (salesCount > 0) {
      throw new BadRequestException(
        'Este cliente possui vendas associadas e não pode ser excluído. Marque o status como "Inativo" em vez de excluir.',
      );
    }

    await this.prisma.customer.delete({ where: { id } });
    return { message: 'Cliente excluído com sucesso.' };
  }
}
