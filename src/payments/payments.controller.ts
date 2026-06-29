import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentsService } from './payments.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('payments')
@Controller('payments')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class PaymentsController {
  constructor(private svc: PaymentsService) {}

  @Get('batches') findBatches(@Request() req, @Query() q: any) { return this.svc.findAllBatches(req.user.tenantId, q); }
  @Post('batches') createBatch(@Request() req, @Body() body: any) { return this.svc.createBatch(req.user.tenantId, body, req.user.id); }
  @Patch('batches/:id/approve') approve(@Request() req, @Param('id') id: string) { return this.svc.approveBatch(req.user.tenantId, id, req.user.id); }
  @Patch('batches/:id/mark-paid') markPaid(@Request() req, @Param('id') id: string) { return this.svc.markAsPaid(req.user.tenantId, id, req.user.id); }
  @Get('released') released(@Request() req) { return this.svc.getReleasedCommissions(req.user.tenantId); }
}
