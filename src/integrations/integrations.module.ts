import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { SalesModule } from '../sales/sales.module';

@Module({
  imports: [SalesModule],
  providers: [IntegrationsService],
  controllers: [IntegrationsController],
})
export class IntegrationsModule {}
