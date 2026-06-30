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
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
let PaymentsService = class PaymentsService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async findAllBatches(tenantId, filters = {}) {
        const where = { tenantId };
        if (filters.status)
            where.status = filters.status;
        if (filters.competence)
            where.competence = filters.competence;
        return this.prisma.paymentBatch.findMany({
            where, include: { items: { include: { commission: { include: { seller: { select: { name: true } }, partner: { select: { name: true } } } } } } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async createBatch(tenantId, dto, userId) {
        const commissions = await this.prisma.commission.findMany({
            where: { tenantId, id: { in: dto.commissionIds }, status: 'RELEASED' },
            include: { seller: true, partner: true, employee: true },
        });
        if (!commissions.length)
            throw new Error('Nenhuma comissao liberada encontrada');
        const total = commissions.reduce((s, c) => s + Number(c.amount), 0);
        const batch = await this.prisma.paymentBatch.create({
            data: {
                tenantId, competence: dto.competence, status: 'OPEN',
                totalGross: total, totalNet: total, createdById: userId,
                items: {
                    create: commissions.map(c => ({
                        commissionId: c.id,
                        beneficiaryType: c.beneficiaryType,
                        beneficiaryId: c.beneficiaryId,
                        beneficiaryName: c.seller?.name || c.partner?.name || c.employee?.name || 'N/A',
                        grossValue: c.amount,
                        netValue: c.amount,
                        pixKey: c.partner?.pixKey || null,
                    })),
                },
            },
            include: { items: true },
        });
        await this.audit.log({ tenantId, userId, action: 'CREATE', entity: 'payment_batch', entityId: batch.id, newData: dto });
        return batch;
    }
    async approveBatch(tenantId, id, userId) {
        const batch = await this.prisma.paymentBatch.findFirst({ where: { id, tenantId } });
        if (!batch)
            throw new common_1.NotFoundException('Lote nao encontrado');
        const updated = await this.prisma.paymentBatch.update({
            where: { id }, data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
        });
        await this.audit.log({ tenantId, userId, action: 'STATUS_CHANGE', entity: 'payment_batch', entityId: id, newData: { status: 'APPROVED' } });
        return updated;
    }
    async markAsPaid(tenantId, id, userId) {
        const batch = await this.prisma.paymentBatch.findFirst({ where: { id, tenantId } });
        if (!batch)
            throw new common_1.NotFoundException('Lote nao encontrado');
        await this.prisma.paymentBatch.update({ where: { id }, data: { status: 'PAID', paidAt: new Date() } });
        const items = await this.prisma.paymentItem.findMany({ where: { batchId: id } });
        await this.prisma.commission.updateMany({
            where: { id: { in: items.map(i => i.commissionId) } },
            data: { status: 'PAID', paidAt: new Date(), forecastStatus: 'paid' },
        });
        await this.audit.log({ tenantId, userId, action: 'STATUS_CHANGE', entity: 'payment_batch', entityId: id, newData: { status: 'PAID' } });
        return { message: 'Lote marcado como pago' };
    }
    async getReleasedCommissions(tenantId) {
        return this.prisma.commission.findMany({
            where: { tenantId, status: 'RELEASED' },
            include: {
                seller: { select: { id: true, name: true } },
                partner: { select: { id: true, name: true } },
                sale: { include: { customer: { select: { companyName: true } } } },
                saleItem: { include: { product: { select: { name: true } } } },
                rule: { select: { name: true } },
            },
            orderBy: { releasedAt: 'desc' },
        });
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, audit_service_1.AuditService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map