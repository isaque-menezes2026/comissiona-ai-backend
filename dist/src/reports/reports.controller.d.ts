import { ReportsService } from './reports.service';
export declare class ReportsController {
    private svc;
    constructor(svc: ReportsService);
    dashboard(req: any): Promise<{
        predicted: import(".prisma/client").Prisma.GetCommissionAggregateType<{
            where: {
                tenantId: string;
                status: "PREDICTED";
            };
            _sum: {
                amount: true;
            };
            _count: true;
        }>;
        released: import(".prisma/client").Prisma.GetCommissionAggregateType<{
            where: {
                tenantId: string;
                status: "RELEASED";
            };
            _sum: {
                amount: true;
            };
            _count: true;
        }>;
        paid: import(".prisma/client").Prisma.GetCommissionAggregateType<{
            where: {
                tenantId: string;
                status: "PAID";
            };
            _sum: {
                amount: true;
            };
            _count: true;
        }>;
        salesThisMonth: ({
            seller: {
                name: string;
            };
            customer: {
                companyName: string;
            };
            items: {
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
            }[];
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
        })[];
        topSellers: (import(".prisma/client").Prisma.PickEnumerable<import(".prisma/client").Prisma.CommissionGroupByOutputType, "sellerId"[]> & {
            _count: number;
            _sum: {
                amount: import("@prisma/client/runtime/library").Decimal;
            };
        })[];
    }>;
    byPeriod(req: any, from: string, to: string): Promise<({
        seller: {
            name: string;
        };
        partner: {
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
    bySeller(req: any, from: string, to: string): Promise<(import(".prisma/client").Prisma.PickEnumerable<import(".prisma/client").Prisma.CommissionGroupByOutputType, "sellerId"[]> & {
        _count: number;
        _sum: {
            amount: import("@prisma/client/runtime/library").Decimal;
        };
    })[]>;
    byProduct(req: any, from: string, to: string): Promise<{
        productName: string;
        total: number;
        count: number;
    }[]>;
    pending(req: any): Promise<({
        seller: {
            name: string;
        };
        partner: {
            name: string;
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
