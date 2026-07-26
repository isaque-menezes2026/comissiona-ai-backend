import { Controller, Get, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReportsService } from './reports.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { isRestrictedUser } from '../common/scope.util';

@ApiTags('reports')
@Controller('reports')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class ReportsController {
  constructor(private svc: ReportsService) {}

  @Get('dashboard')
  dashboard(@Request() req) {
    return this.svc.dashboardSummary(req.user.tenantId, req.user);
  }

  @Get('ranking')
  ranking(@Request() req, @Query('from') from?: string, @Query('to') to?: string) {
    if (isRestrictedUser(req.user)) throw new ForbiddenException('Relatorio disponivel apenas para administracao.');
    return this.svc.ranking(req.user.tenantId, from, to);
  }

  @Get('by-period')
  byPeriod(@Request() req, @Query('from') from: string, @Query('to') to: string) {
    if (isRestrictedUser(req.user)) throw new ForbiddenException('Relatorio disponivel apenas para administracao.');
    return this.svc.commissionsByPeriod(req.user.tenantId, from, to);
  }

  @Get('by-seller')
  bySeller(@Request() req, @Query('from') from: string, @Query('to') to: string) {
    if (isRestrictedUser(req.user)) throw new ForbiddenException('Relatorio disponivel apenas para administracao.');
    return this.svc.commissionsBySeller(req.user.tenantId, from, to);
  }

  @Get('by-product')
  byProduct(@Request() req, @Query('from') from: string, @Query('to') to: string) {
    if (isRestrictedUser(req.user)) throw new ForbiddenException('Relatorio disponivel apenas para administracao.');
    return this.svc.commissionsByProduct(req.user.tenantId, from, to);
  }

  @Get('pending-payments')
  pending(@Request() req) {
    if (isRestrictedUser(req.user)) throw new ForbiddenException('Relatorio disponivel apenas para administracao.');
    return this.svc.pendingPayments(req.user.tenantId);
  }
}
