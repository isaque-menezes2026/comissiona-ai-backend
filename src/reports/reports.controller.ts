import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReportsService } from './reports.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('reports')
@Controller('reports')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class ReportsController {
  constructor(private svc: ReportsService) {}

  @Get('dashboard')
  dashboard(@Request() req) {
    return this.svc.dashboardSummary(req.user.tenantId);
  }

  @Get('ranking')
  ranking(@Request() req, @Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.ranking(req.user.tenantId, from, to);
  }

  @Get('by-period')
  byPeriod(@Request() req, @Query('from') from: string, @Query('to') to: string) {
    return this.svc.commissionsByPeriod(req.user.tenantId, from, to);
  }

  @Get('by-seller')
  bySeller(@Request() req, @Query('from') from: string, @Query('to') to: string) {
    return this.svc.commissionsBySeller(req.user.tenantId, from, to);
  }

  @Get('by-product')
  byProduct(@Request() req, @Query('from') from: string, @Query('to') to: string) {
    return this.svc.commissionsByProduct(req.user.tenantId, from, to);
  }

  @Get('pending-payments')
  pending(@Request() req) {
    return this.svc.pendingPayments(req.user.tenantId);
  }
}
