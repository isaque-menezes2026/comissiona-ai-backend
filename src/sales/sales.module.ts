import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { CommissionEngineModule } from '../commission-engine/commission-engine.module';
import { AuditModule } from '../audit/audit.module';

@Module({ imports: [CommissionEngineModule, AuditModule], providers: [SalesService], controllers: [SalesController], exports: [SalesService] })
export class SalesModule {}
