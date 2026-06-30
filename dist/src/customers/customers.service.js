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
exports.CustomersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
let CustomersService = class CustomersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(tenantId, filters = {}) {
        const where = { tenantId };
        if (filters.status)
            where.status = filters.status;
        if (filters.sellerId)
            where.sellerId = filters.sellerId;
        if (filters.search)
            where.OR = [
                { companyName: { contains: filters.search, mode: 'insensitive' } },
                { tradeName: { contains: filters.search, mode: 'insensitive' } },
                { document: { contains: filters.search } },
            ];
        return this.prisma.customer.findMany({
            where,
            include: {
                seller: { select: { id: true, name: true } },
                partner: { select: { id: true, name: true } },
            },
            orderBy: { companyName: 'asc' },
        });
    }
    async findOne(tenantId, id) {
        const c = await this.prisma.customer.findFirst({
            where: { id, tenantId },
            include: {
                seller: true, partner: true, employee: true,
                sales: { include: { items: { include: { product: true } } }, orderBy: { saleDate: 'desc' } },
            },
        });
        if (!c)
            throw new common_1.NotFoundException('Cliente não encontrado');
        return c;
    }
    async create(tenantId, dto) {
        return this.prisma.customer.create({ data: { ...dto, tenantId } });
    }
    async update(tenantId, id, dto) {
        await this.findOne(tenantId, id);
        return this.prisma.customer.update({ where: { id }, data: dto });
    }
};
exports.CustomersService = CustomersService;
exports.CustomersService = CustomersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CustomersService);
//# sourceMappingURL=customers.service.js.map