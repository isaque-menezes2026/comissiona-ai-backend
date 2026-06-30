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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../common/prisma/prisma.service");
const bcrypt = require("bcryptjs");
let AuthService = class AuthService {
    constructor(prisma, jwt) {
        this.prisma = prisma;
        this.jwt = jwt;
    }
    async login(email, password) {
        const user = await this.prisma.user.findFirst({
            where: { email, active: true },
            include: { tenant: true },
        });
        if (!user)
            throw new common_1.UnauthorizedException('Credenciais inválidas');
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid)
            throw new common_1.UnauthorizedException('Credenciais inválidas');
        await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        const payload = { sub: user.id, tenantId: user.tenantId, role: user.role, email: user.email };
        return {
            accessToken: this.jwt.sign(payload),
            user: { id: user.id, name: user.name, email: user.email, role: user.role, tenant: { id: user.tenant.id, name: user.tenant.name, slug: user.tenant.slug } },
        };
    }
    async me(userId) {
        return this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true, role: true, tenantId: true, sellerId: true, partnerId: true, tenant: { select: { id: true, name: true, slug: true, taxRate: true } } },
        });
    }
    async changePassword(userId, oldPassword, newPassword) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        const valid = await bcrypt.compare(oldPassword, user.passwordHash);
        if (!valid)
            throw new common_1.UnauthorizedException('Senha atual incorreta');
        const hash = await bcrypt.hash(newPassword, 10);
        await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
        return { message: 'Senha alterada com sucesso' };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map