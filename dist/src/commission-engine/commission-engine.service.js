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
var CommissionEngineService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommissionEngineService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const client_1 = require("@prisma/client");
const dayjs = require("dayjs");
let CommissionEngineService = CommissionEngineService_1 = class CommissionEngineService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
        this.logger = new common_1.Logger(CommissionEngineService_1.name);
    }
    async processSale(ctx) {
        const { tenantId, saleId } = ctx;
        this.logger.log(`[ENGINE] Processando venda ${saleId} para tenant ${tenantId}`);
        const sale = await this.prisma.sale.findUnique({
            where: { id: saleId },
            include: {
                items: { include: { product: true } },
                seller: true,
                partner: true,
                employee: true,
                customer: true,
            },
        });
        if (!sale || sale.tenantId !== tenantId) {
            this.logger.warn(`[ENGINE] Venda ${saleId} não encontrada ou tenant inválido.`);
            return;
        }
        for (const item of sale.items) {
            await this.processItem(sale, item, ctx);
        }
        await this.audit.log({
            tenantId,
            action: 'COMMISSION_CALCULATED',
            entity: 'sale',
            entityId: saleId,
            metadata: { itemCount: sale.items.length },
            userId: ctx.triggeredBy,
        });
    }
    async processItem(sale, item, ctx) {
        const rules = await this.findApplicableRules(sale, item);
        for (const rule of rules) {
            const exists = await this.prisma.commission.findFirst({
                where: {
                    tenantId: ctx.tenantId,
                    saleId: sale.id,
                    saleItemId: item.id,
                    ruleId: rule.id,
                },
            });
            if (exists)
                continue;
            const commission = await this.calculateCommission(sale, item, rule);
            if (!commission)
                continue;
            await this.createCommission(ctx.tenantId, sale, item, rule, commission, ctx.triggeredBy);
        }
    }
    async findApplicableRules(sale, item) {
        const rules = await this.prisma.commissionRule.findMany({
            where: {
                tenantId: sale.tenantId,
                active: true,
                OR: [
                    { productId: item.productId },
                    { productId: null },
                ],
                AND: [
                    {
                        OR: [
                            { saleOrigin: sale.origin },
                            { saleOrigin: 'any' },
                            { saleOrigin: null },
                        ],
                    },
                ],
            },
        });
        return rules.filter((rule) => {
            if (rule.beneficiaryType === client_1.BeneficiaryType.PARTNER && !sale.partnerId)
                return false;
            if (rule.beneficiaryType === client_1.BeneficiaryType.EMPLOYEE && !sale.employeeId)
                return false;
            const now = new Date();
            if (rule.startDate && rule.startDate > now)
                return false;
            if (rule.endDate && rule.endDate < now)
                return false;
            return true;
        });
    }
    calculateCommission(sale, item, rule) {
        const netValue = Number(item.netValue);
        switch (rule.commissionType) {
            case client_1.CommissionType.FIXED_AMOUNT:
                return {
                    amount: Number(rule.fixedAmount),
                    baseValue: null,
                    isFixed: true,
                };
            case client_1.CommissionType.PERCENTAGE_IMPLANTATION:
                if (item.type !== 'IMPLANTATION')
                    return null;
                return {
                    amount: (netValue * Number(rule.percentage)) / 100,
                    baseValue: netValue,
                    isFixed: false,
                };
            case client_1.CommissionType.PERCENTAGE_MONTHLY:
                if (item.type !== 'MONTHLY')
                    return null;
                return {
                    amount: (netValue * Number(rule.percentage)) / 100,
                    baseValue: netValue,
                    isFixed: false,
                };
            case client_1.CommissionType.FIRST_MONTHLY_PAYMENT:
                if (item.type !== 'MONTHLY')
                    return null;
                return {
                    amount: (netValue * Number(rule.percentage ?? 100)) / 100,
                    baseValue: netValue,
                    isFixed: false,
                };
            case client_1.CommissionType.THIRD_MONTHLY_PAYMENT:
                if (item.type !== 'MONTHLY')
                    return null;
                return {
                    amount: (netValue * Number(rule.percentage ?? 100)) / 100,
                    baseValue: netValue,
                    isFixed: false,
                };
            case client_1.CommissionType.RECURRING:
                if (item.type !== 'MONTHLY')
                    return null;
                return {
                    amount: (netValue * Number(rule.percentage)) / 100,
                    baseValue: netValue,
                    isFixed: false,
                };
            default:
                return null;
        }
    }
    async createCommission(tenantId, sale, item, rule, calc, userId) {
        const { beneficiaryId, sellerId, partnerId, employeeId } = this.resolveBeneficiary(sale, rule.beneficiaryType);
        const forecast = this.calculateForecast(sale, rule);
        const initialStatus = this.resolveInitialStatus(rule, sale);
        await this.prisma.commission.create({
            data: {
                tenantId,
                saleId: sale.id,
                saleItemId: item.id,
                ruleId: rule.id,
                beneficiaryType: rule.beneficiaryType,
                beneficiaryId,
                sellerId,
                partnerId,
                employeeId,
                status: initialStatus,
                commissionType: rule.commissionType,
                baseValue: calc.baseValue,
                percentage: rule.percentage,
                amount: calc.amount,
                isFixed: calc.isFixed,
                forecastReason: forecast.reason,
                dateSaleBase: sale.billingStartDate || sale.contractDate || sale.saleDate,
                dateExpectedBilling: forecast.expectedBilling,
                dateExpectedCustomerPayment: forecast.expectedCustomerPayment,
                dateExpectedRelease: forecast.expectedRelease,
                avgReceiptDays: forecast.avgDays,
                expectedPaymentCompetence: forecast.competence,
                forecastStatus: forecast.forecastStatus,
            },
        });
        this.logger.log(`[ENGINE] Comissão criada: ${calc.amount} para ${beneficiaryId} | ${rule.commissionType} | ${initialStatus}`);
    }
    resolveBeneficiary(sale, beneficiaryType) {
        switch (beneficiaryType) {
            case client_1.BeneficiaryType.SELLER:
                return {
                    beneficiaryId: sale.sellerId,
                    sellerId: sale.sellerId,
                    partnerId: null,
                    employeeId: null,
                };
            case client_1.BeneficiaryType.PARTNER:
                return {
                    beneficiaryId: sale.partnerId,
                    sellerId: null,
                    partnerId: sale.partnerId,
                    employeeId: null,
                };
            case client_1.BeneficiaryType.EMPLOYEE:
                return {
                    beneficiaryId: sale.employeeId,
                    sellerId: null,
                    partnerId: null,
                    employeeId: sale.employeeId,
                };
        }
    }
    calculateForecast(sale, rule) {
        const base = dayjs(sale.billingStartDate || sale.contractDate || sale.saleDate);
        let avgDays = rule.appliesAfterDays || 30;
        let reason = 'Faturamento';
        let forecastStatus = 'awaiting_billing';
        switch (rule.commissionType) {
            case client_1.CommissionType.THIRD_MONTHLY_PAYMENT:
                avgDays = rule.appliesAfterDays || 90;
                reason = '3ª mensalidade paga';
                forecastStatus = 'awaiting_third_payment';
                break;
            case client_1.CommissionType.FIRST_MONTHLY_PAYMENT:
                avgDays = rule.appliesAfterDays || 30;
                reason = '1ª mensalidade paga';
                forecastStatus = 'awaiting_first_payment';
                break;
            case client_1.CommissionType.PERCENTAGE_IMPLANTATION:
                avgDays = rule.appliesAfterDays || 30;
                reason = 'Implantação faturada e paga';
                forecastStatus = 'awaiting_implantation_payment';
                break;
            case client_1.CommissionType.FIXED_AMOUNT:
                avgDays = rule.appliesAfterDays || 15;
                reason = 'Contrato convertido / faturado';
                forecastStatus = 'awaiting_contract';
                break;
        }
        const expectedBilling = base.add(7, 'day').toDate();
        const expectedCustomerPayment = base.add(avgDays, 'day').toDate();
        const expectedRelease = base.add(avgDays + 5, 'day').toDate();
        const competence = dayjs(expectedRelease).format('YYYY-MM');
        return {
            avgDays,
            reason,
            forecastStatus,
            expectedBilling,
            expectedCustomerPayment,
            expectedRelease,
            competence,
        };
    }
    resolveInitialStatus(rule, sale) {
        if (rule.requiresManagerApproval)
            return client_1.CommissionStatus.BLOCKED;
        if (rule.commissionType === client_1.CommissionType.THIRD_MONTHLY_PAYMENT ||
            rule.commissionType === client_1.CommissionType.FIRST_MONTHLY_PAYMENT) {
            return client_1.CommissionStatus.PREDICTED;
        }
        if (rule.triggerEvent === client_1.TriggerEvent.CONTRACT_SIGNED &&
            sale.contractDate) {
            return client_1.CommissionStatus.RELEASED;
        }
        return client_1.CommissionStatus.PREDICTED;
    }
    async processInvoicePaid(tenantId, saleId, installmentNum, userId) {
        this.logger.log(`[ENGINE] Fatura ${installmentNum} paga para venda ${saleId}`);
        const commissions = await this.prisma.commission.findMany({
            where: { tenantId, saleId, status: { in: [client_1.CommissionStatus.PREDICTED, client_1.CommissionStatus.BLOCKED] } },
            include: { rule: true },
        });
        for (const commission of commissions) {
            const shouldRelease = this.evaluateTrigger(commission, installmentNum);
            if (!shouldRelease)
                continue;
            await this.prisma.commission.update({
                where: { id: commission.id },
                data: {
                    status: client_1.CommissionStatus.RELEASED,
                    releasedAt: new Date(),
                    forecastStatus: 'released',
                },
            });
            await this.audit.log({
                tenantId,
                action: 'COMMISSION_RELEASED',
                entity: 'commission',
                entityId: commission.id,
                metadata: { installmentNum, trigger: commission.rule.triggerEvent },
                userId,
            });
            this.logger.log(`[ENGINE] Comissão ${commission.id} liberada (parcela ${installmentNum})`);
        }
    }
    evaluateTrigger(commission, installmentNum) {
        const trigger = commission.rule.triggerEvent;
        switch (trigger) {
            case client_1.TriggerEvent.INVOICE_PAID:
                return true;
            case client_1.TriggerEvent.FIRST_INVOICE_PAID:
                return installmentNum === 1;
            case client_1.TriggerEvent.THIRD_INVOICE_PAID:
                return installmentNum === 3;
            default:
                return false;
        }
    }
    async cancelSaleCommissions(tenantId, saleId, reason, userId) {
        const result = await this.prisma.commission.updateMany({
            where: {
                tenantId,
                saleId,
                status: { in: [client_1.CommissionStatus.PREDICTED, client_1.CommissionStatus.BLOCKED] },
            },
            data: {
                status: client_1.CommissionStatus.CANCELLED,
                cancelledAt: new Date(),
                cancelReason: reason,
                forecastStatus: 'cancelled',
            },
        });
        await this.audit.log({
            tenantId,
            action: 'COMMISSIONS_CANCELLED',
            entity: 'sale',
            entityId: saleId,
            metadata: { count: result.count, reason },
            userId,
        });
        return result;
    }
    async recalculate(ctx) {
        this.logger.log(`[ENGINE] Recalculando comissões da venda ${ctx.saleId} autorizado por ${ctx.authorizedById}`);
        await this.cancelSaleCommissions(ctx.tenantId, ctx.saleId, 'Recalculado por alteração de venda', ctx.authorizedById);
        await this.processSale(ctx);
        await this.audit.log({
            tenantId: ctx.tenantId,
            action: 'COMMISSION_RECALCULATED',
            entity: 'sale',
            entityId: ctx.saleId,
            userId: ctx.authorizedById,
        });
    }
};
exports.CommissionEngineService = CommissionEngineService;
exports.CommissionEngineService = CommissionEngineService = CommissionEngineService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], CommissionEngineService);
//# sourceMappingURL=commission-engine.service.js.map