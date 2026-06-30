import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
interface CalculationContext {
    tenantId: string;
    saleId: string;
    triggeredBy?: string;
}
export declare class CommissionEngineService {
    private prisma;
    private audit;
    private readonly logger;
    constructor(prisma: PrismaService, audit: AuditService);
    processSale(ctx: CalculationContext): Promise<void>;
    private processItem;
    private findApplicableRules;
    private calculateCommission;
    private createCommission;
    private resolveBeneficiary;
    private calculateForecast;
    private resolveInitialStatus;
    processInvoicePaid(tenantId: string, saleId: string, installmentNum: number, userId?: string): Promise<void>;
    private evaluateTrigger;
    cancelSaleCommissions(tenantId: string, saleId: string, reason: string, userId?: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    recalculate(ctx: CalculationContext & {
        authorizedById: string;
    }): Promise<void>;
}
export {};
