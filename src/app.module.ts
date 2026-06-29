import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { ProductsModule } from './products/products.module';
import { CommissionRulesModule } from './commission-rules/commission-rules.module';
import { PeopleModule } from './people/people.module';
import { CustomersModule } from './customers/customers.module';
import { SalesModule } from './sales/sales.module';
import { CommissionEngineModule } from './commission-engine/commission-engine.module';
import { CommissionsModule } from './commissions/commissions.module';
import { PaymentsModule } from './payments/payments.module';
import { GoalsModule } from './goals/goals.module';
import { ReportsModule } from './reports/reports.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    TenantsModule,
    ProductsModule,
    CommissionRulesModule,
    PeopleModule,
    CustomersModule,
    SalesModule,
    CommissionEngineModule,
    CommissionsModule,
    PaymentsModule,
    GoalsModule,
    ReportsModule,
    AuditModule,
  ],
})
export class AppModule {}
