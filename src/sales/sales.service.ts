// src/sales/sales.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CommissionEngineService } from '../commission-engine/commission-engine.service';
import { AuditService } from '../audit/audit.service';
import { SaleStatus } from '@prisma/client';

export interface CreateSaleDto {
  customerId: string;
  sellerId?: string;
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

    if (!dto.sellerId && !dto.partnerId) {
      throw new BadRequestException('Informe o vendedor responsável ou o parceiro indicador da venda.');
    }

    const taxRateDecimal = dto.taxRate / 100;

    const sale = await this.prisma.sale.create({
      data: {
        tenantId,
        customerId: dto.customerId,
        sellerId: dto.sellerId || null,
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

    if (sale.status === SaleStatus.CANCELLED) {
      throw new BadRequestException('Não é possível editar uma venda cancelada.');
    }

    const taxRateDecimal =
      dto.taxRate !== undefined ? dto.taxRate / 100 : Number(sale.taxRate);

    const nextSellerId = dto.sellerId !== undefined ? (dto.sellerId || null) : sale.sellerId;
    const nextPartnerId = dto.partnerId !== undefined ? (dto.partnerId || null) : sale.partnerId;
    if (!nextSellerId && !nextPartnerId) {
      throw new BadRequestException('Informe o vendedor responsável ou o parceiro indicador da venda.');
    }

    const updateData: any = {};
    if (dto.customerId !== undefined) updateData.customerId = dto.customerId;
    if (dto.sellerId !== undefined) updateData.sellerId = dto.sellerId || null;
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

    if (dto.items !== undefined) {
      if (dto.items.length === 0) {
        throw new BadRequestException('A venda deve ter pelo menos um item (produto).');
      }

      await this.engine.cancelSaleCommissions(
        tenantId, id,
        'Venda editada — itens atualizados, recalculando comissões',
        userId,
      );

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

    if (dto.items !== undefined) {
      setImmediate(() => {
        this.engine.processSale({ tenantId, saleId: id, triggeredBy: userId });
      });
    }

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

  async uploadContractFile(tenantId: string, saleId: string, file: any, userId: string) {
    if (!file) {
      throw new BadRequestException('Envie o arquivo no campo "file".');
    }
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Apenas arquivos PDF são aceitos.');
    }
    const MAX_SIZE_BYTES = 15 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      throw new BadRequestException('Arquivo maior que 15MB.');
    }

    const sale = await this.prisma.sale.findFirst({ where: { id: saleId, tenantId } });
    if (!sale) throw new NotFoundException('Venda não encontrada.');

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      throw new BadRequestException(
        'Upload de contrato não configurado (faltam as variáveis SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no backend).',
      );
    }

    const bucket = 'sale-contracts';
    const path = `${tenantId}/${saleId}-${Date.now()}.pdf`;

    const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        'Content-Type': 'application/pdf',
      },
      body: file.buffer,
    });
    if (!uploadRes.ok) {
      throw new BadRequestException(`Erro ao enviar arquivo: ${await uploadRes.text()}`);
    }

    const signRes = await fetch(`${supabaseUrl}/storage/v1/object/sign/${bucket}/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiresIn: 60 * 60 * 24 * 365 * 10 }),
    });
    if (!signRes.ok) {
      throw new BadRequestException(`Erro ao gerar link do arquivo: ${await signRes.text()}`);
    }
    const signData = (await signRes.json()) as { signedURL: string };
    const contractFileUrl = `${supabaseUrl}/storage/v1${signData.signedURL}`;

    const updated = await this.prisma.sale.update({
      where: { id: saleId },
      data: { contractFileUrl },
    });

    await this.audit.log({
      tenantId,
      userId,
      action: 'CONTRACT_FILE_ATTACHED',
      entity: 'sale',
      entityId: saleId,
      newData: { contractFileUrl },
    });

    return updated;
  }
}
