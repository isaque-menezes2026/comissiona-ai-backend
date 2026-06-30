import { GoalsService } from './goals.service';
export declare class GoalsController {
    private svc;
    constructor(svc: GoalsService);
    findAll(req: any, month: string): Promise<({
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
    progress(req: any, month: string): Promise<{
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
    create(req: any, body: any): Promise<{
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
    update(req: any, id: string, body: any): Promise<{
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
}
