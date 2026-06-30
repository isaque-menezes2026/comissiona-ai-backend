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
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
let ProductsService = class ProductsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(tenantId, includeInactive = false) {
        return this.prisma.product.findMany({
            where: { tenantId, ...(includeInactive ? {} : { active: true }), parentId: null },
            include: { modules: { where: includeInactive ? {} : { active: true } } },
            orderBy: { name: 'asc' },
        });
    }
    async findOne(tenantId, id) {
        const p = await this.prisma.product.findFirst({
            where: { id, tenantId },
            include: { modules: true, commissionRules: true },
        });
        if (!p)
            throw new common_1.NotFoundException('Produto não encontrado');
        return p;
    }
    async create(tenantId, dto) {
        return this.prisma.product.create({ data: { ...dto, tenantId } });
    }
    async update(tenantId, id, dto) {
        await this.findOne(tenantId, id);
        return this.prisma.product.update({ where: { id }, data: dto });
    }
    async remove(tenantId, id) {
        await this.findOne(tenantId, id);
        return this.prisma.product.update({ where: { id }, data: { active: false } });
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProductsService);
//# sourceMappingURL=products.service.js.map