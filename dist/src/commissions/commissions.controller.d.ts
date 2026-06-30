import { CommissionsService } from './commissions.service';
export declare class CommissionsController {
    private svc;
    constructor(svc: CommissionsService);
    findAll(req: any, q: any): Promise<({
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
                id: string;
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
                id: string;
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
            id: string;
            name: string;
            commissionType: import(".prisma/client").$Enums.CommissionType;
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
    mySummary(req: any): Promise<{
        predicted: import(".prisma/client").Prisma.GetCommissionAggregateType<{
            where: {
                tenantId: string;
                sellerId: string;
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
                sellerId: string;
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
                sellerId: string;
                status: "PAID";
            };
            _sum: {
                amount: true;
            };
            _count: true;
        }>;
        thisMonth: import(".prisma/client").Prisma.GetCommissionAggregateType<{
            where: {
                tenantId: string;
                sellerId: string;
                expectedPaymentCompetence: string;
            };
            _sum: {
                amount: true;
            };
        }>;
        recent: ({
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
        })[];
    }>;
    findOne(req: any, id: string): Promise<{
        seller: {
            id: string;
            name: string;
            email: string;
            phone: string | null;
            active: boolean;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            role: string | null;
            team: string | null;
            managerId: string | null;
            status: string;
            joinDate: Date | null;
        };
        partner: {
            id: string;
            name: string;
            document: string | null;
            email: string;
            phone: string | null;
            active: boolean;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            type: string;
            status: string;
            notes: string | null;
            pixKey: string | null;
            bankName: string | null;
            bankAgency: string | null;
            bankAccount: string | null;
            authorizedProducts: string[];
        };
        sale: {
            seller: {
                id: string;
                name: string;
                email: string;
                phone: string | null;
                active: boolean;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                role: string | null;
                team: string | null;
                managerId: string | null;
                status: string;
                joinDate: Date | null;
            };
            customer: {
                id: string;
                document: string | null;
                email: string | null;
                phone: string | null;
                active: boolean;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                sellerId: string | null;
                partnerId: string | null;
                employeeId: string | null;
                status: string;
                notes: string | null;
                origin: string | null;
                tradeName: string | null;
                companyName: string;
                segment: string | null;
                city: string | null;
                state: string | null;
                entryDate: Date | null;
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
                id: string;
                name: string;
                active: boolean;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                description: string | null;
                category: string | null;
                type: import(".prisma/client").$Enums.ProductType;
                parentId: string | null;
                color: string | null;
                hasImplantation: boolean;
                hasMonthly: boolean;
                allowsUpsell: boolean;
                allowsCrossSell: boolean;
                generatesCommission: boolean;
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
            id: string;
            name: string;
            active: boolean;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            description: string | null;
            fixedAmount: import("@prisma/client/runtime/library").Decimal | null;
            percentage: import("@prisma/client/runtime/library").Decimal | null;
            saleOrigin: string | null;
            productCategory: string | null;
            beneficiaryType: import(".prisma/client").$Enums.BeneficiaryType;
            commissionType: import(".prisma/client").$Enums.CommissionType;
            triggerEvent: import(".prisma/client").$Enums.TriggerEvent;
            installmentNumber: number | null;
            appliesAfterDays: number | null;
            appliesOnNetAmount: boolean;
            requiresCustomerActive: boolean;
            requiresInvoicePaid: boolean;
            requiresManagerApproval: boolean;
            startDate: Date | null;
            endDate: Date | null;
            productId: string | null;
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
    }>;
    cancel(req: any, id: string, body: {
        reason: string;
    }): Promise<{
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
    }>;
    processInvoice(req: any, body: any): Promise<{
        message: string;
    }>;
}
