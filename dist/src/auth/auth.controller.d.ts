import { AuthService } from './auth.service';
export declare class AuthController {
    private auth;
    constructor(auth: AuthService);
    login(body: {
        email: string;
        password: string;
    }): Promise<{
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
    me(req: any): Promise<{
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
    changePassword(req: any, body: {
        oldPassword: string;
        newPassword: string;
    }): Promise<{
        message: string;
    }>;
}
