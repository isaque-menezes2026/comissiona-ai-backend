// src/sales/sales.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CommissionEngineService } from '../commission-engine/commission-engine.service';
import { AuditService } from '../audit/audit.service';
import { SaleStatus } from '@prisma/client';

export interface CreateSaleDto {
  customerId: string;
  sellerId: string;
  partnerId?: string;
  employeeId?: string;
  origin: string;
  taxRate: number;
  saleDate: string;
  contractDate?: string;
  billingStartDate?: string;
  contractFileUrl?: string;
  notes?: string;
  items: Array<{
    productId: string;
    type: 'IMPLANTATION' | 'MONTHLY' | 'ONE_TIME' | 'ANNUAL';
    grossValue: number;
    quantity?: number;
    notes?: string;
  }>;
}

export interface UpdateSaleDto {
  customerId?: string;
  sellerId?: string;
  partnerId?: string;
  employeeId?: string;
  origin?: string;
  taxRate?: number;
  saleDate?: string;
  contractDate?: string;
  billingStartDate?: string;
  contractFileUrl?: string;
  notes?: string;
  status?: SaleStatus;
  items?: Array<{
    productId: string;
    type: 'IMPLANTATION' | 'MONTHLY' | 'ONE_TIME' | 'ANNUAL';
    grossValue: number;
    quantity?: number;
    notes?: string;
  }>;
}

export interface RegisterInvoicePaymentDto {
  saleId: string;
  installmentNum: number;
  paidAmount: number;
  paidAt?: string;
}

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private engine: CommissionEngineService,
    private audit: AuditService,
  ) {}

  async create(tenantId: string, dto: CreateSaleDto, userId: string) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('A venda deve ter pelo menos um item (produto).');
    }

    const taxRateDecimal = dto.taxRate / 100;

    const sale = await this.prisma.sale.create({
      data: {
        tenantId,
        customerId: dto.customerId,
        sellerId: dto.sellerId,
        partnerId: dto.partnerId || null,
        employeeId: dto.employeeId || null,
        origin: dto.origin,
        status: SaleStatus.CONTRACT_SIGNED,
        taxRate: taxRateDecimal,
        saleDate: new Date(dto.saleDate),
        contractDate: dto.contractDate ? new Date(dto.contractDate) : null,
        billingStartDate: dto.billingStartDate ? new Date(dto.billingStartDate) : null,
        contractFileUrl: dto.contractFileUrl || null,
        notes: dto.notes,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            type: item.type,
            grossValue: item.grossValue,
            netValue: parseFloat((item.grossValue * (1 - taxRateDecimal)).toFixed(2)),
            taxRate: taxRateDecimal,
            quantity: item.quantity || 1,
            notes: item.notes,
          })),
        },
      },
      include: {
        items: { include: { product: true } },
        customer: true,
        seller: true,
        partner: true,
      },
    });

    await this.audit.log({
      tenantId,
      action: 'CREATE',
      entity: 'sale',
      entityId: sale.id,
      newData: dto,
      userId,
    });

    setImmediate(() => {
      this.engine.processSale({ tenantId, saleId: sale.id, triggeredBy: userId });
    });

    return sale;
  }

  async update(tenantId: string, id: string, dto: UpdateSaleDto, userId: string) {
    const sale = await this.prisma.sale.findFirst({ where: { id, tenantId } });
    if (!sale) throw new NotFoundException('Venda não encontrada.');

    // Não permite editar venda cancelada
    if (sale.status === SaleStatus.CANCELLED) {
      throw new BadRequestException('Não é possível editar uma venda cancelada.');
    }

    const taxRateDecimal =
      dto.taxRate !== undefined ? dto.taxRate / 100 : Number(sale.taxRate);

    const updateData: any = {};
    if (dto.customerId !== undefined) updateData.customerId = dto.customerId;
    if (dto.sellerId !== undefined) updateData.sellerId = dto.sellerId;
    if (dto.partnerId !== undefined) updateData.partnerId = dto.partnerId || null;
    if (dto.employeeId !== undefined) updateData.employeeId = dto.employeeId || null;
    if (dto.origin !== undefined) updateData.origin = dto.origin;
    if (dto.taxRate !== undefined) updateData.taxRate = taxRateDecimal;
    if (dto.saleDate !== undefined) updateData.saleDate = new Date(dto.saleDate);
    if (dto.contractDate !== undefined) updateData.contractDate = dto.contractDate ? new Date(dto.contractDate) : null;
    if (dto.billingStartDate !== undefined) updateData.billingStartDate = dto.billingStartDate ? new Date(dto.billingStartDate) : null;
    if (dto.contractFileUrl !== undefined) updateData.contractFileUrl = dto.contractFileUrl || null;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.status !== undefined) {
      updateData.status = dto.status;
      if (dto.status === SaleStatus.CANCELLED) updateData.cancelledAt = new Date();
    }

    // Se há novos itens, cancela comissões previstas e recria os itens
    if (dto.items !== undefined) {
      if (dto.items.length === 0) {
        throw new BadRequestException('A venda deve ter pelo menos um item (produto).');
      }

      // Cancela comissões PREDICTED para recalcular
      await this.engine.cancelSaleCommissions(
        tenantId, id,
        'Venda editada — itens atualizados, recalculando comissões',
        userId,
      );

      // Deleta itens existentes e cria os novos
      await this.prisma.saleItem.deleteMany({ where: { saleId: id } });

      updateData.items = {
        create: dto.items.map((item) => ({
          productId: item.productId,
          type: item.type,
          grossValue: item.grossValue,
          netValue: parseFloat((item.grossValue * (1 - taxRateDecimal)).toFixed(2)),
          taxRate: taxRateDecimal,
          quantity: item.quantity || 1,
          notes: item.notes,
        })),
      };
    }

    const updated = await this.prisma.sale.update({
      where: { id },
      data: updateData,
      include: {
        items: { include: { product: true } },
        customer: true,
        seller: true,
        partner: true,
      },
    });

    await this.audit.log({
      tenantId,
      userId,
      action: 'UPDATE',
      entity: 'sale',
      entityId: id,
      previousData: sale,
      newData: dto,
    });

    // Se itens foram atualizados, roda o motor de comissão novamente
    if (dto.items !== undefined) {
      setImmediate(() => {
        this.engine.processSale({ tenantId, saleId: id, triggeredBy: userId });
      });
    }

    // Se cancelada via edição, cancela comissões
    if (dto.status === SaleStatus.CANCELLED || dto.status === SaleStatus.DEFAULTING) {
      await this.engine.cancelSaleCommissions(
        tenantId, id,
        dto.status === SaleStatus.CANCELLED ? 'Venda cancelada' : 'Inadimplência',
        userId,
      );
    }

    return updated;
  }

  async findAll(tenantId: string, filters: {
    status?: string;
    sellerId?: string;
    month?: string;
    origin?: string;
  } = {}) {
    const where: any = { tenantId };
    if (filters.status) where.status = filters.status;
    if (filters.sellerId) where.sellerId = filters.sellerId;
    if (filters.origin) where.origin = filters.origin;
    if (filters.month) {
      const start = new Date(`${filters.month}-01`);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      where.saleDate = { gte: start, lt: end };
    }

    return this.prisma.sale.findMany({
      where,
      include: {
        items: { include: { product: true } },
        customer: { select: { id: true, companyName: true, tradeName: true } },
        seller: { select: { id: true, name: true } },
        partner: { select: { id: true, name: true } },
        commissions: {
          select: {
            id: true, status: true, amount: true, commissionType: true,
            beneficiaryType: true, forecastReason: true, expectedPaymentCompetence: true,
            dateExpectedRelease: true,
          },
        },
      },
      orderBy: { saleDate: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, tenantId },
      include: {
        items: { include: { product: true } },
        customer: true,
        seller: true,
        partner: true,
        employee: true,
        commissions: {
          include: {
            rule: true,
            seller: { select: { id: true, name: true } },
            partner: { select: { id: true, name: true } },
          },
        },
        invoices: { orderBy: { installmentNum: 'asc' } },
      },
    });

    if (!sale) throw new NotFoundException('Venda não encontrada.');
    return sale;
  }

  async updateStatus(tenantId: string, saleId: string, status: SaleStatus, userId: string, reason?: string) {
    const sale = await this.prisma.sale.findFirst({ where: { id: saleId, tenantId } });
    if (!sale) throw new NotFoundException();

    const prevStatus = sale.status;

    const updated = await this.prisma.sale.update({
      where: { id: saleId },
      data: {
        status,
        cancelledAt: status === SaleStatus.CANCELLED ? new Date() : undefined,
        cancelReason: reason,
      },
    });

    await this.audit.log({
      tenantId, userId,
      action: 'STATUS_CHANGE',
      entity: 'sale',
      entityId: saleId,
      previousData: { status: prevStatus },
      newData: { status, reason },
    });

    if (status === SaleStatus.CANCELLED || status === SaleStatus.DEFAULTING) {
      await this.engine.cancelSaleCommissions(
        tenantId, saleId,
        status === SaleStatus.CANCELLED ? 'Venda cancelada' : 'Inadimplência',
        userId,
      );
    }

    return updated;
  }

  // Exclusão só é permitida se a venda não tiver nenhuma comissão já paga.
  // Caso contrário, orienta a cancelar a venda em vez de excluir (preserva histórico financeiro).
  async remove(tenantId: string, id: string, userId: string) {
    const sale = await this.prisma.sale.findFirst({ where: { id, tenantId } });
    if (!sale) throw new NotFoundException('Venda não encontrada.');

    const paidCount = await this.prisma.commission.count({
      where: { tenantId, saleId: id, status: 'PAID' },
    });
    if (paidCount > 0) {
      throw new BadRequestException(
        'Esta venda possui comissões já pagas e não pode ser excluída. Cancele a venda em vez de excluir.',
      );
    }

    await this.prisma.commission.deleteMany({ where: { tenantId, saleId: id } });
    await this.prisma.invoice.deleteMany({ where: { tenantId, saleId: id } });
    await this.prisma.sale.delete({ where: { id } });

    await this.audit.log({
      tenantId,
      userId,
      action: 'DELETE',
      entity: 'sale',
      entityId: id,
      previousData: sale,
    });

    return { message: 'Venda excluída com sucesso.' };
  }

  async registerInvoicePayment(tenantId: string, dto: RegisterInvoicePaymentDto, userId: string) {
    const sale = await this.prisma.sale.findFirst({ where: { id: dto.saleId, tenantId } });
    if (!sale) throw new NotFoundException();

    await this.prisma.invoice.upsert({
      where: {
        id: `${dto.saleId}-${dto.installmentNum}`,
      },
      create: {
        id: `${dto.saleId}-${dto.installmentNum}`,
        tenantId,
        saleId: dto.saleId,
        installmentNum: dto.installmentNum,
        dueDate: dto.paidAt ? new Date(dto.paidAt) : new Date(),
        amount: dto.paidAmount,
        status: 'PAID',
        paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
        paidAmount: dto.paidAmount,
      },
      update: {
        status: 'PAID',
        paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
        paidAmount: dto.paidAmount,
      },
    });

    await this.audit.log({
      tenantId, userId,
      action: 'INVOICE_PAID',
      entity: 'sale',
      entityId: dto.saleId,
      newData: dto,
    });

    await this.engine.processInvoicePaid(tenantId, dto.saleId, dto.installmentNum, userId);

    return { message: `Parcela ${dto.installmentNum} registrada. Motor de comissão notificado.` };
  }
}
