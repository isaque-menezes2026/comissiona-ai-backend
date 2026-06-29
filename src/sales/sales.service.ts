// src/sales/sales.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
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
  notes?: string;
  items: Array<{
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
        notes: dto.notes,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            type: item.type,
            grossValue: item.grossValue,
            // ADENDO: valor líquido calculado automaticamente
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

    // Dispara motor de comissão assincronamente
    setImmediate(() => {
      this.engine.processSale({ tenantId, saleId: sale.id, triggeredBy: userId });
    });

    return sale;
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

    // Se cancelado, cancela comissões previstas
    if (status === SaleStatus.CANCELLED || status === SaleStatus.DEFAULTING) {
      await this.engine.cancelSaleCommissions(
        tenantId, saleId,
        status === SaleStatus.CANCELLED ? 'Venda cancelada' : 'Inadimplência',
        userId,
      );
    }

    return updated;
  }

  async registerInvoicePayment(tenantId: string, dto: RegisterInvoicePaymentDto, userId: string) {
    const sale = await this.prisma.sale.findFirst({ where: { id: dto.saleId, tenantId } });
    if (!sale) throw new NotFoundException();

    // Cria ou atualiza fatura
    await this.prisma.invoice.upsert({
      where: {
        // findFirst fallback se não tiver unique composto
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

    // Dispara liberação de comissões pelo motor
    await this.engine.processInvoicePaid(tenantId, dto.saleId, dto.installmentNum, userId);

    return { message: `Parcela ${dto.installmentNum} registrada. Motor de comissão notificado.` };
  }
}
