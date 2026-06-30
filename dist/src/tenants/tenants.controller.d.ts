import { TenantsService } from './tenants.service';
export declare class TenantsController {
    private svc;
    constructor(svc: TenantsService);
    getMe(req: any): Promise<{
        id: string;
        slug: string;
        name: string;
        document: string | null;
        email: string;
        phone: string | null;
        logoUrl: string | null;
        taxRate: import("@prisma/client/runtime/library").Decimal;
        plan: string;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(req: any, body: any): Promise<{
        id: string;
        slug: string;
        name: string;
        document: string | null;
        email: string;
        phone: string | null;
        logoUrl: string | null;
        taxRate: import("@prisma/client/runtime/library").Decimal;
        plan: string;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getUsers(req: any): Promise<{
        id: string;
        name: string;
        email: string;
        active: boolean;
        createdAt: Date;
        role: import(".prisma/client").$Enums.UserRole;
        lastLoginAt: Date;
    }[]>;
    createUser(req: any, body: any): Promise<{
        id: string;
        name: string;
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
    }>;
    dashboard(req: any): Promise<{
        sellers: number;
        partners: number;
        customers: number;
        salesActive: number;
        commissionsTotal: import(".prisma/client").Prisma.GetCommissionAggregateType<{
            where: {
                tenantId: string;
            };
            _sum: {
                amount: true;
            };
            _count: true;
        }>;
        byStatus: (import(".prisma/client").Prisma.PickEnumerable<import(".prisma/client").Prisma.CommissionGroupByOutputType, "status"[]> & {
            _count: number;
            _sum: {
                amount: import("@prisma/client/runtime/library").Decimal;
            };
        })[];
    }>;
}
