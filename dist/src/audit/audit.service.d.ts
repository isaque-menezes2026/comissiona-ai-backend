import { PrismaService } from '../common/prisma/prisma.service';
interface AuditLogDto {
    tenantId: string;
    userId?: string;
    action: string;
    entity: string;
    entityId?: string;
    previousData?: any;
    newData?: any;
    ipAddress?: string;
    metadata?: any;
}
export declare class AuditService {
    private prisma;
    constructor(prisma: PrismaService);
    log(dto: AuditLogDto): Promise<void>;
    findByEntity(tenantId: string, entity: string, entityId: string): Promise<({
        user: {
            name: string;
            email: string;
        };
    } & {
        id: string;
        createdAt: Date;
        tenantId: string;
        action: string;
        entity: string;
        entityId: string | null;
        previousData: import("@prisma/client/runtime/library").JsonValue | null;
        newData: import("@prisma/client/runtime/library").JsonValue | null;
        ipAddress: string | null;
        userAgent: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        userId: string | null;
    })[]>;
}
export {};
