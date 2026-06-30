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
exports.TenantsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const bcrypt = require("bcryptjs");
let TenantsService = class TenantsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findOne(id) {
        const t = await this.prisma.tenant.findUnique({ where: { id } });
        if (!t)
            throw new common_1.NotFoundException('Empresa não encontrada');
        return t;
    }
    async update(id, data) {
        return this.prisma.tenant.update({ where: { id }, data });
    }
    async getUsers(tenantId) {
        return this.prisma.user.findMany({
            where: { tenantId },
            select: { id: true, name: true, email: true, role: true, active: true, lastLoginAt: true, createdAt: true },
            orderBy: { name: 'asc' },
        });
    }
    async createUser(tenantId, dto) {
        const hash = await bcrypt.hash(dto.password, 10);
        return this.prisma.user.create({
            data: { tenantId, name: dto.name, email: dto.email, passwordHash: hash, role: dto.role || 'SELLER' },
            select: { id: true, name: true, email: true, role: true },
        });
    }
    async getDashboardStats(tenantId) {
        const [sellers, partners, customers, salesActive, commissionsTotal] = await Promise.all([
            this.prisma.seller.count({ where: { tenantId, active: true } }),
            this.prisma.partner.count({ where: { tenantId, active: true } }),
            this.prisma.customer.count({ where: { tenantId, active: true } }),
            this.prisma.sale.count({ where: { tenantId, status: { in: ['ACTIVE', 'CONTRACT_SIGNED', 'IN_IMPLEMENTATION'] } } }),
            this.prisma.commission.aggregate({ where: { tenantId }, _sum: { amount: true }, _count: true }),
        ]);
        const byStatus = await this.prisma.commission.groupBy({
            by: ['status'], where: { tenantId }, _sum: { amount: true }, _count: true,
        });
        return { sellers, partners, customers, salesActive, commissionsTotal, byStatus };
    }
};
exports.TenantsService = TenantsService;
exports.TenantsService = TenantsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TenantsService);
//# sourceMappingURL=tenants.service.js.map