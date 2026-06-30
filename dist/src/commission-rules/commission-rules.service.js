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
exports.CommissionRulesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
let CommissionRulesService = class CommissionRulesService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async findAll(tenantId) {
        return this.prisma.commissionRule.findMany({
            where: { tenantId },
            include: { product: { select: { id: true, name: true } } },
            orderBy: { name: 'asc' },
        });
    }
    async findOne(tenantId, id) {
        const r = await this.prisma.commissionRule.findFirst({ where: { id, tenantId }, include: { product: true } });
        if (!r)
            throw new common_1.NotFoundException('Regra não encontrada');
        return r;
    }
    async create(tenantId, dto, userId) {
        const rule = await this.prisma.commissionRule.create({ data: { ...dto, tenantId } });
        await this.audit.log({ tenantId, userId, action: 'CREATE', entity: 'commission_rule', entityId: rule.id, newData: dto });
        return rule;
    }
    async update(tenantId, id, dto, userId) {
        const prev = await this.findOne(tenantId, id);
        const rule = await this.prisma.commissionRule.update({ where: { id }, data: dto });
        await this.audit.log({ tenantId, userId, action: 'UPDATE', entity: 'commission_rule', entityId: id, previousData: prev, newData: dto });
        return rule;
    }
    async remove(tenantId, id, userId) {
        await this.findOne(tenantId, id);
        const rule = await this.prisma.commissionRule.update({ where: { id }, data: { active: false } });
        await this.audit.log({ tenantId, userId, action: 'DELETE', entity: 'commission_rule', entityId: id });
        return rule;
    }
};
exports.CommissionRulesService = CommissionRulesService;
exports.CommissionRulesService = CommissionRulesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, audit_service_1.AuditService])
], CommissionRulesService);
//# sourceMappingURL=commission-rules.service.js.map