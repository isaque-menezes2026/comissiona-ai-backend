"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_module_1 = require("./common/prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const tenants_module_1 = require("./tenants/tenants.module");
const products_module_1 = require("./products/products.module");
const commission_rules_module_1 = require("./commission-rules/commission-rules.module");
const people_module_1 = require("./people/people.module");
const customers_module_1 = require("./customers/customers.module");
const sales_module_1 = require("./sales/sales.module");
const commission_engine_module_1 = require("./commission-engine/commission-engine.module");
const commissions_module_1 = require("./commissions/commissions.module");
const payments_module_1 = require("./payments/payments.module");
const goals_module_1 = require("./goals/goals.module");
const reports_module_1 = require("./reports/reports.module");
const audit_module_1 = require("./audit/audit.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            tenants_module_1.TenantsModule,
            products_module_1.ProductsModule,
            commission_rules_module_1.CommissionRulesModule,
            people_module_1.PeopleModule,
            customers_module_1.CustomersModule,
            sales_module_1.SalesModule,
            commission_engine_module_1.CommissionEngineModule,
            commissions_module_1.CommissionsModule,
            payments_module_1.PaymentsModule,
            goals_module_1.GoalsModule,
            reports_module_1.ReportsModule,
            audit_module_1.AuditModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map