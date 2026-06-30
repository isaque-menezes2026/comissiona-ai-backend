import { PrismaService } from '../common/prisma/prisma.service';
export declare class GoalsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(tenantId: string, month?: string): Promise<({
        seller: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        sellerId: string | null;
        type: string;
        notes: string | null;
        month: string;
        teamName: string | null;
        targetValue: import("@prisma/client/runtime/library").Decimal;
        achievedValue: import("@prisma/client/runtime/library").Decimal;
        bonusAmount: import("@prisma/client/runtime/library").Decimal | null;
        bonusPercentage: import("@prisma/client/runtime/library").Decimal | null;
    })[]>;
    create(tenantId: string, dto: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        sellerId: string | null;
        type: string;
        notes: string | null;
        month: string;
        teamName: string | null;
        targetValue: import("@prisma/client/runtime/library").Decimal;
        achievedValue: import("@prisma/client/runtime/library").Decimal;
        bonusAmount: import("@prisma/client/runtime/library").Decimal | null;
        bonusPercentage: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    update(tenantId: string, id: string, dto: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        sellerId: string | null;
        type: string;
        notes: string | null;
        month: string;
        teamName: string | null;
        targetValue: import("@prisma/client/runtime/library").Decimal;
        achievedValue: import("@prisma/client/runtime/library").Decimal;
        bonusAmount: import("@prisma/client/runtime/library").Decimal | null;
        bonusPercentage: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    getProgress(tenantId: string, month: string): Promise<{
        achieved: number;
        percentage: number;
        seller: {
            id: string;
            name: string;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        sellerId: string | null;
        type: string;
        notes: string | null;
        month: string;
        teamName: string | null;
        targetValue: import("@prisma/client/runtime/library").Decimal;
        achievedValue: import("@prisma/client/runtime/library").Decimal;
        bonusAmount: import("@prisma/client/runtime/library").Decimal | null;
        bonusPercentage: import("@prisma/client/runtime/library").Decimal | null;
    }[]>;
}
