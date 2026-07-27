import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CommissionsService } from './commissions.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, ROLE_GROUPS } from '../common/decorators/roles.decorator';

@ApiTags('commissions')
@Controller('commissions')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class CommissionsController {
  constructor(private svc: CommissionsService) {}

  @Get() findAll(@Request() req, @Query() q: any) { return this.svc.findAll(req.user.tenantId, q, req.user); }
  @Get('my-summary') mySummary(@Request() req) { return this.svc.findMySummary(req.user.tenantId, req.user.sellerId, req.user); }
  @Get(':id') findOne(@Request() req, @Param('id') id: string) { return this.svc.findOne(req.user.tenantId, id, req.user); }

  @Patch(':id/cancel')
  @Roles(...ROLE_GROUPS.MANAGEMENT)
  cancel(@Request() req, @Param('id') id: string, @Body() body: { reason: string }) {
    return this.svc.cancel(req.user.tenantId, id, body.reason, req.user.id);
  }

  @Post('process-invoice')
  @Roles(...ROLE_GROUPS.MANAGEMENT)
  processInvoice(@Request() req, @Body() body: any) {
    return this.svc.processInvoice(req.user.tenantId, body, req.user.id);
  }
}
