import { Module } from '@nestjs/common';
import { CommissionsService } from './commissions.service';
import { CommissionsController } from './commissions.controller';
import { AuditModule } from '../audit/audit.module';
import { CommissionEngineModule } from '../commission-engine/commission-engine.module';

@Module({
  imports: [AuditModule, CommissionEngineModule],
  providers: [CommissionsService],
  controllers: [CommissionsController],
  exports: [CommissionsService],
})
export class CommissionsModule {}
