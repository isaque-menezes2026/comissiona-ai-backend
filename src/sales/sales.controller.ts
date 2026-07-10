import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SalesService, CreateSaleDto, UpdateSaleDto, RegisterInvoicePaymentDto } from './sales.service';

@ApiTags('sales')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('sales')
export class SalesController {
  constructor(private sales: SalesService) {}

  @Post()
  create(@Request() req, @Body() dto: CreateSaleDto) {
    return this.sales.create(req.user.tenantId, dto, req.user.id);
  }

  @Get()
  findAll(@Request() req, @Query() filters: any) {
    return this.sales.findAll(req.user.tenantId, filters);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.sales.findOne(req.user.tenantId, id);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateSaleDto) {
    return this.sales.update(req.user.tenantId, id, dto, req.user.id);
  }

  @Patch(':id/status')
  updateStatus(@Request() req, @Param('id') id: string, @Body() body: { status: any; reason?: string }) {
    return this.sales.updateStatus(req.user.tenantId, id, body.status, req.user.id, body.reason);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.sales.remove(req.user.tenantId, id, req.user.id);
  }

  // Anexo avulso de contrato assinado (vendas fechadas fora do portal Kualiz).
  @Post(':id/contract-file')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } }))
  uploadContractFile(@Request() req, @Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.sales.uploadContractFile(req.user.tenantId, id, file, req.user.id);
  }

  @Post('invoices/payment')
  registerInvoicePayment(@Request() req, @Body() dto: RegisterInvoicePaymentDto) {
    return this.sales.registerInvoicePayment(req.user.tenantId, dto, req.user.id);
  }
}
