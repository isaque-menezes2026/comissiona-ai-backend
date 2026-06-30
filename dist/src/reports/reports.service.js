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
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
let ReportsService = class ReportsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async commissionsByPeriod(tenantId, from, to) {
        return this.prisma.commission.findMany({
            where: { tenantId, createdAt: { gte: new Date(from), lte: new Date(to) } },
            include: {
                seller: { select: { name: true } }, partner: { select: { name: true } },
                saleItem: { include: { product: { select: { name: true } } } },
                sale: { include: { customer: { select: { companyName: true } } } }, rule: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async commissionsBySeller(tenantId, from, to) {
        return this.prisma.commission.groupBy({
            by: ['sellerId'],
            where: { tenantId, sellerId: { not: null }, createdAt: { gte: new Date(from), lte: new Date(to) } },
            _sum: { amount: true }, _count: true,
        });
    }
    async commissionsByProduct(tenantId, from, to) {
        const items = await this.prisma.commission.findMany({
            where: { tenantId, createdAt: { gte: new Date(from), lte: new Date(to) } },
            include: { saleItem: { include: { product: { select: { id: true, name: true } } } } },
        });
        const map = {};
        for (const c of items) {
            const pName = c.saleItem?.product?.name || 'N/A';
            const pId = c.saleItem?.product?.id || 'na';
            if (!map[pId])
                map[pId] = { productName: pName, total: 0, count: 0 };
            map[pId].total += Number(c.amount);
            map[pId].count++;
        }
        return Object.values(map).sort((a, b) => b.total - a.total);
    }
    async dashboardSummary(tenantId) {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const [predicted, released, paid, salesThisMonth, topSellers] = await Promise.all([
            this.prisma.commission.aggregate({ where: { tenantId, status: 'PREDICTED' }, _sum: { amount: true }, _count: true }),
            this.prisma.commission.aggregate({ where: { tenantId, status: 'RELEASED' }, _sum: { amount: true }, _count: true }),
            this.prisma.commission.aggregate({ where: { tenantId, status: 'PAID' }, _sum: { amount: true }, _count: true }),
            this.prisma.sale.findMany({ where: { tenantId, saleDate: { gte: monthStart }, status: { not: 'CANCELLED' } }, include: { items: true, seller: { select: { name: true } }, customer: { select: { companyName: true } } }, orderBy: { saleDate: 'desc' }, take: 10 }),
            this.prisma.commission.groupBy({ by: ['sellerId'], where: { tenantId, sellerId: { not: null } }, _sum: { amount: true }, _count: true, orderBy: { _sum: { amount: 'desc' } }, take: 5 }),
        ]);
        return { predicted, released, paid, salesThisMonth, topSellers };
    }
    async pendingPayments(tenantId) {
        return this.prisma.commission.findMany({
            where: { tenantId, status: 'RELEASED' },
            include: { seller: { select: { name: true } }, partner: { select: { name: true } }, saleItem: { include: { product: { select: { name: true } } } } },
            orderBy: { releasedAt: 'asc' },
        });
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map