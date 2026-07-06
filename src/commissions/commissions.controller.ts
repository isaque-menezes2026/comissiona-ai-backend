import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CommissionsService } from './commissions.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('commissions')
@Controller('commissions')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class CommissionsController {
  constructor(private svc: CommissionsService) {}

  @Get() findAll(@Request() req, @Query() q: any) { return this.svc.findAll(req.user.tenantId, q); }
  @Get('my-summary') mySummary(@Request() req) { return this.svc.findMySummary(req.user.tenantId, req.user.sellerId); }
  @Get(':id') findOne(@Request() req, @Param('id') id: string) { return this.svc.findOne(req.user.tenantId, id); }
  @Patch(':id/cancel') cancel(@Request() req, @Param('id') id: string, @Body() body: { reason: string }) {
    return this.svc.cancel(req.user.tenantId, id, body.reason, req.user.id);
  }
  @Post('process-invoice') processInvoice(@Request() req, @Body() body: any) {
    return this.svc.processInvoice(req.user.tenantId, body, req.user.id);
  }
  @Patch('mark-paid') markPaid(@Request() req, @Body() body: { ids: string[] }) {
    return this.svc.markPaid(req.user.tenantId, body.ids, req.user.id);
  }
  @Patch('refresh-forecast-text') refreshForecastText(@Request() req) {
    return this.svc.refreshForecastText(req.user.tenantId);
  }
  @Patch('fix-origin-scoping') fixOriginScoping(@Request() req) {
    return this.svc.fixOriginScoping(req.user.tenantId);
  }
  @Delete(':id') remove(@Request() req, @Param('id') id: string) {
    return this.svc.remove(req.user.tenantId, id, req.user.id);
  }
}
