"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const commission_engine_service_1 = require("../commission-engine/commission-engine.service");
const audit_service_1 = require("../audit/audit.service");
const client_1 = require("@prisma/client");
let SalesService = class SalesService {
    constructor(prisma, engine, audit) {
        this.prisma = prisma;
        this.engine = engine;
        this.audit = audit;
    }
    async create(tenantId, dto, userId) {
        const taxRateDecimal = dto.taxRate / 100;
        const sale = await this.prisma.sale.create({
            data: {
                tenantId,
                customerId: dto.customerId,
                sellerId: dto.sellerId,
                partnerId: dto.partnerId || null,
                employeeId: dto.employeeId || null,
                origin: dto.origin,
                status: client_1.SaleStatus.CONTRACT_SIGNED,
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
    async findAll(tenantId, filters = {}) {
        const where = { tenantId };
        if (filters.status)
            where.status = filters.status;
        if (filters.sellerId)
            where.sellerId = filters.sellerId;
        if (filters.origin)
            where.origin = filters.origin;
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
    async findOne(tenantId, id) {
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
        if (!sale)
            throw new common_1.NotFoundException('Venda não encontrada.');
        return sale;
    }
    async updateStatus(tenantId, saleId, status, userId, reason) {
        const sale = await this.prisma.sale.findFirst({ where: { id: saleId, tenantId } });
        if (!sale)
            throw new common_1.NotFoundException();
        const prevStatus = sale.status;
        const updated = await this.prisma.sale.update({
            where: { id: saleId },
            data: {
                status,
                cancelledAt: status === client_1.SaleStatus.CANCELLED ? new Date() : undefined,
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
        if (status === client_1.SaleStatus.CANCELLED || status === client_1.SaleStatus.DEFAULTING) {
            await this.engine.cancelSaleCommissions(tenantId, saleId, status === client_1.SaleStatus.CANCELLED ? 'Venda cancelada' : 'Inadimplência', userId);
        }
        return updated;
    }
    async registerInvoicePayment(tenantId, dto, userId) {
        const sale = await this.prisma.sale.findFirst({ where: { id: dto.saleId, tenantId } });
        if (!sale)
            throw new common_1.NotFoundException();
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
};
exports.SalesService = SalesService;
exports.SalesService = SalesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        commission_engine_service_1.CommissionEngineService,
        audit_service_1.AuditService])
], SalesService);
//# sourceMappingURL=sales.service.js.map