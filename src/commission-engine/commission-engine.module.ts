import { Module } from '@nestjs/common';
import { CommissionEngineService } from './commission-engine.service';
import { AuditModule } from '../audit/audit.module';

@Module({ imports: [AuditModule], providers: [CommissionEngineService], exports: [CommissionEngineService] })
export class CommissionEngineModule {}
