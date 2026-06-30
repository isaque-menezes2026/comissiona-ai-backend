import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';
export declare class AuthService {
    private prisma;
    private jwt;
    constructor(prisma: PrismaService, jwt: JwtService);
    login(email: string, password: string): Promise<{
        accessToken: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: import(".prisma/client").$Enums.UserRole;
            tenant: {
                id: string;
                name: string;
                slug: string;
            };
        };
    }>;
    me(userId: string): Promise<{
        id: string;
        name: string;
        email: string;
        tenant: {
            id: string;
            slug: string;
            name: string;
            taxRate: import("@prisma/client/runtime/library").Decimal;
        };
        tenantId: string;
        role: import(".prisma/client").$Enums.UserRole;
        sellerId: string;
        partnerId: string;
    }>;
    changePassword(userId: string, oldPassword: string, newPassword: string): Promise<{
        message: string;
    }>;
}
