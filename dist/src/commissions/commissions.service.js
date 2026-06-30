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
exports.CommissionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const commission_engine_service_1 = require("../commission-engine/commission-engine.service");
let CommissionsService = class CommissionsService {
    constructor(prisma, audit, engine) {
        this.prisma = prisma;
        this.audit = audit;
        this.engine = engine;
    }
    async findAll(tenantId, filters = {}) {
        const where = { tenantId };
        if (filters.status)
            where.status = filters.status;
        if (filters.sellerId)
            where.sellerId = filters.sellerId;
        if (filters.month)
            where.expectedPaymentCompetence = filters.month;
        return this.prisma.commission.findMany({
            where,
            include: {
                sale: { include: { customer: { select: { id: true, companyName: true } } } },
                saleItem: { include: { product: { select: { id: true, name: true } } } },
                seller: { select: { id: true, name: true } },
                partner: { select: { id: true, name: true } },
                rule: { select: { id: true, name: true, commissionType: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(tenantId, id) {
        const c = await this.prisma.commission.findFirst({
            where: { id, tenantId },
            include: { sale: { include: { customer: true, seller: true } }, saleItem: { include: { product: true } }, seller: true, partner: true, rule: true },
        });
        if (!c)
            throw new common_1.NotFoundException('Comissao nao encontrada');
        return c;
    }
    async findMySummary(tenantId, sellerId) {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const [predicted, released, paid, thisMonth] = await Promise.all([
            this.prisma.commission.aggregate({ where: { tenantId, sellerId, status: 'PREDICTED' }, _sum: { amount: true }, _count: true }),
            this.prisma.commission.aggregate({ where: { tenantId, sellerId, status: 'RELEASED' }, _sum: { amount: true }, _count: true }),
            this.prisma.commission.aggregate({ where: { tenantId, sellerId, status: 'PAID' }, _sum: { amount: true }, _count: true }),
            this.prisma.commission.aggregate({ where: { tenantId, sellerId, expectedPaymentCompetence: currentMonth }, _sum: { amount: true } }),
        ]);
        const recent = await this.prisma.commission.findMany({
            where: { tenantId, sellerId },
            include: { saleItem: { include: { product: { select: { name: true } } } }, sale: { include: { customer: { select: { companyName: true } } } } },
            orderBy: { createdAt: 'desc' },
            take: 10,
        });
        return { predicted, released, paid, thisMonth, recent };
    }
    async cancel(tenantId, id, reason, userId) {
        const c = await this.findOne(tenantId, id);
        const updated = await this.prisma.commission.update({
            where: { id },
            data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason, forecastStatus: 'cancelled' },
        });
        await this.audit.log({ tenantId, userId, action: 'STATUS_CHANGE', entity: 'commission', entityId: id, previousData: { status: c.status }, newData: { status: 'CANCELLED', reason } });
        return updated;
    }
    async processInvoice(tenantId, dto, userId) {
        await this.prisma.invoice.updateMany({
            where: { tenantId, saleId: dto.saleId, installmentNum: dto.installmentNum },
            data: { status: 'PAID', paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(), paidAmount: dto.paidAmount },
        });
        await this.engine.processInvoicePaid(tenantId, dto.saleId, dto.installmentNum, userId);
        return { message: 'Parcela ' + dto.installmentNum + ' processada com sucesso' };
    }
};
exports.CommissionsService = CommissionsService;
exports.CommissionsService = CommissionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        commission_engine_service_1.CommissionEngineService])
], CommissionsService);
//# sourceMappingURL=commissions.service.js.map