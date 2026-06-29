import { Module } from '@nestjs/common';
import { CommissionRulesService } from './commission-rules.service';
import { CommissionRulesController } from './commission-rules.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [CommissionRulesService],
  controllers: [CommissionRulesController],
  exports: [CommissionRulesService],
})
export class CommissionRulesModule {}
