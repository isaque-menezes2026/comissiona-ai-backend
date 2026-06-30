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
exports.PeopleService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
let PeopleService = class PeopleService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAllSellers(tenantId) {
        return this.prisma.seller.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
    }
    async createSeller(tenantId, dto) {
        return this.prisma.seller.create({ data: { ...dto, tenantId } });
    }
    async updateSeller(tenantId, id, dto) {
        return this.prisma.seller.update({ where: { id }, data: dto });
    }
    async findAllPartners(tenantId) {
        return this.prisma.partner.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
    }
    async createPartner(tenantId, dto) {
        return this.prisma.partner.create({ data: { ...dto, tenantId } });
    }
    async updatePartner(tenantId, id, dto) {
        return this.prisma.partner.update({ where: { id }, data: dto });
    }
    async findAllEmployees(tenantId) {
        return this.prisma.employee.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
    }
    async createEmployee(tenantId, dto) {
        return this.prisma.employee.create({ data: { ...dto, tenantId } });
    }
    async updateEmployee(tenantId, id, dto) {
        return this.prisma.employee.update({ where: { id }, data: dto });
    }
    async getRanking(tenantId, month) {
        const start = new Date(`${month}-01`);
        const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
        const sales = await this.prisma.sale.groupBy({
            by: ['sellerId'],
            where: { tenantId, saleDate: { gte: start, lte: end } },
            _count: true,
        });
        const commissions = await this.prisma.commission.groupBy({
            by: ['sellerId'],
            where: { tenantId, createdAt: { gte: start, lte: end }, sellerId: { not: null } },
            _sum: { amount: true },
        });
        const sellers = await this.prisma.seller.findMany({ where: { tenantId, active: true } });
        return sellers.map(s => ({
            seller: s,
            salesCount: sales.find(x => x.sellerId === s.id)?._count || 0,
            totalCommission: Number(commissions.find(x => x.sellerId === s.id)?._sum?.amount || 0),
        })).sort((a, b) => b.totalCommission - a.totalCommission).map((x, i) => ({ ...x, rank: i + 1 }));
    }
};
exports.PeopleService = PeopleService;
exports.PeopleService = PeopleService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PeopleService);
//# sourceMappingURL=people.service.js.map