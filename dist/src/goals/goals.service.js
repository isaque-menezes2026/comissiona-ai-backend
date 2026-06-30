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
exports.GoalsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
let GoalsService = class GoalsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(tenantId, month) {
        return this.prisma.goal.findMany({
            where: { tenantId, ...(month ? { month } : {}) },
            include: { seller: { select: { id: true, name: true } } },
            orderBy: { month: 'desc' },
        });
    }
    async create(tenantId, dto) {
        return this.prisma.goal.create({ data: { ...dto, tenantId } });
    }
    async update(tenantId, id, dto) {
        return this.prisma.goal.update({ where: { id }, data: dto });
    }
    async getProgress(tenantId, month) {
        const goals = await this.findAll(tenantId, month);
        const start = new Date(`${month}-01`);
        const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
        return Promise.all(goals.map(async (g) => {
            let achieved = 0;
            if (g.type === 'revenue' || g.type === 'sales_count') {
                const agg = await this.prisma.sale.aggregate({
                    where: { tenantId, sellerId: g.sellerId || undefined, saleDate: { gte: start, lte: end }, status: { not: 'CANCELLED' } },
                    _count: true,
                });
                achieved = agg._count;
            }
            const pct = Number(g.targetValue) > 0 ? (achieved / Number(g.targetValue)) * 100 : 0;
            return { ...g, achieved, percentage: Math.min(pct, 100) };
        }));
    }
};
exports.GoalsService = GoalsService;
exports.GoalsService = GoalsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GoalsService);
//# sourceMappingURL=goals.service.js.map