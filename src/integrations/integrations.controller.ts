import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IntegrationsService, ExternalSaleDto } from './integrations.service';
import { IntegrationKeyGuard } from '../common/guards/integration-key.guard';

// Endpoints server-to-server para sistemas externos (ex: kualiz-portal) criarem
// vendas no Comissiona a partir de propostas aceitas. Autenticado por chave de
// API (header x-integration-key), não por JWT de usuário.
@ApiTags('integrations')
@UseGuards(IntegrationKeyGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(private integrations: IntegrationsService) {}

  @Get('sellers')
  listSellers() {
    return this.integrations.listSellers();
  }

  @Get('products')
  listProducts() {
    return this.integrations.listProducts();
  }

  @Post('external-sale')
  convert(@Body() dto: ExternalSaleDto) {
    return this.integrations.convertExternalSale(dto);
  }

  // Anexa/atualiza o link do contrato assinado numa venda já convertida (quando o
  // arquivo é enviado no sistema externo depois da conversão original).
  @Post('external-sale/:saleId/contract-file')
  attachContractFile(@Param('saleId') saleId: string, @Body() body: { contractUrl: string }) {
    return this.integrations.attachContractFile(saleId, body.contractUrl);
  }
}
