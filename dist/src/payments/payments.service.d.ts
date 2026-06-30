import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
export declare class PaymentsService {
    private prisma;
    private audit;
    constructor(prisma: PrismaService, audit: AuditService);
    findAllBatches(tenantId: string, filters?: any): Promise<({
        items: ({
            commission: {
                seller: {
                    name: string;
                };
                partner: {
                    name: string;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                sellerId: string | null;
                partnerId: string | null;
                employeeId: string | null;
                percentage: import("@prisma/client/runtime/library").Decimal | null;
                beneficiaryType: import(".prisma/client").$Enums.BeneficiaryType;
                commissionType: import(".prisma/client").$Enums.CommissionType;
                status: import(".prisma/client").$Enums.CommissionStatus;
                saleId: string;
                saleItemId: string | null;
                ruleId: string;
                beneficiaryId: string;
                baseValue: import("@prisma/client/runtime/library").Decimal | null;
                amount: import("@prisma/client/runtime/library").Decimal;
                isFixed: boolean;
                forecastReason: string | null;
                blockReason: string | null;
                dateSaleBase: Date | null;
                dateExpectedBilling: Date | null;
                dateExpectedCustomerPayment: Date | null;
                dateExpectedRelease: Date | null;
                avgReceiptDays: number | null;
                expectedPaymentCompetence: string | null;
                forecastStatus: string | null;
                releasedAt: Date | null;
                paidAt: Date | null;
                cancelledAt: Date | null;
                cancelReason: string | null;
                notes: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            beneficiaryType: import(".prisma/client").$Enums.BeneficiaryType;
            status: string;
            beneficiaryId: string;
            notes: string | null;
            pixKey: string | null;
            grossValue: import("@prisma/client/runtime/library").Decimal;
            netValue: import("@prisma/client/runtime/library").Decimal;
            beneficiaryName: string | null;
            discounts: import("@prisma/client/runtime/library").Decimal;
            paymentMethod: string | null;
            receiptUrl: string | null;
            commissionId: string;
            batchId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        status: import(".prisma/client").$Enums.PaymentBatchStatus;
        paidAt: Date | null;
        notes: string | null;
        competence: string;
        totalGross: import("@prisma/client/runtime/library").Decimal;
        totalNet: import("@prisma/client/runtime/library").Decimal;
        createdById: string | null;
        approvedById: string | null;
        approvedAt: Date | null;
    })[]>;
    createBatch(tenantId: string, dto: {
        competence: string;
        commissionIds: string[];
    }, userId: string): Promise<{
        items: {
            id: string;
            createdAt: Date;
            beneficiaryType: import(".prisma/client").$Enums.BeneficiaryType;
            status: string;
            beneficiaryId: string;
            notes: string | null;
            pixKey: string | null;
            grossValue: import("@prisma/client/runtime/library").Decimal;
            netValue: import("@prisma/client/runtime/library").Decimal;
            beneficiaryName: string | null;
            discounts: import("@prisma/client/runtime/library").Decimal;
            paymentMethod: string | null;
            receiptUrl: string | null;
            commissionId: string;
            batchId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        status: import(".prisma/client").$Enums.PaymentBatchStatus;
        paidAt: Date | null;
        notes: string | null;
        competence: string;
        totalGross: import("@prisma/client/runtime/library").Decimal;
        totalNet: import("@prisma/client/runtime/library").Decimal;
        createdById: string | null;
        approvedById: string | null;
        approvedAt: Date | null;
    }>;
    approveBatch(tenantId: string, id: string, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        status: import(".prisma/client").$Enums.PaymentBatchStatus;
        paidAt: Date | null;
        notes: string | null;
        competence: string;
        totalGross: import("@prisma/client/runtime/library").Decimal;
        totalNet: import("@prisma/client/runtime/library").Decimal;
        createdById: string | null;
        approvedById: string | null;
        approvedAt: Date | null;
    }>;
    markAsPaid(tenantId: string, id: string, userId: string): Promise<{
        message: string;
    }>;
    getReleasedCommissions(tenantId: string): Promise<({
        seller: {
            id: string;
            name: string;
        };
        partner: {
            id: string;
            name: string;
        };
        sale: {
            customer: {
                companyName: string;
            };
        } & {
            id: string;
            taxRate: import("@prisma/client/runtime/library").Decimal;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            sellerId: string;
            partnerId: string | null;
            employeeId: string | null;
            status: import(".prisma/client").$Enums.SaleStatus;
            cancelledAt: Date | null;
            cancelReason: string | null;
            notes: string | null;
            customerId: string;
            origin: string;
            saleDate: Date;
            contractDate: Date | null;
            billingStartDate: Date | null;
        };
        saleItem: {
            product: {
                name: string;
            };
        } & {
            id: string;
            taxRate: import("@prisma/client/runtime/library").Decimal;
            createdAt: Date;
            type: import(".prisma/client").$Enums.ItemType;
            productId: string;
            saleId: string;
            notes: string | null;
            grossValue: import("@prisma/client/runtime/library").Decimal;
            netValue: import("@prisma/client/runtime/library").Decimal;
            quantity: number;
        };
        rule: {
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        sellerId: string | null;
        partnerId: string | null;
        employeeId: string | null;
        percentage: import("@prisma/client/runtime/library").Decimal | null;
        beneficiaryType: import(".prisma/client").$Enums.BeneficiaryType;
        commissionType: import(".prisma/client").$Enums.CommissionType;
        status: import(".prisma/client").$Enums.CommissionStatus;
        saleId: string;
        saleItemId: string | null;
        ruleId: string;
        beneficiaryId: string;
        baseValue: import("@prisma/client/runtime/library").Decimal | null;
        amount: import("@prisma/client/runtime/library").Decimal;
        isFixed: boolean;
        forecastReason: string | null;
        blockReason: string | null;
        dateSaleBase: Date | null;
        dateExpectedBilling: Date | null;
        dateExpectedCustomerPayment: Date | null;
        dateExpectedRelease: Date | null;
        avgReceiptDays: number | null;
        expectedPaymentCompetence: string | null;
        forecastStatus: string | null;
        releasedAt: Date | null;
        paidAt: Date | null;
        cancelledAt: Date | null;
        cancelReason: string | null;
        notes: string | null;
    })[]>;
}
