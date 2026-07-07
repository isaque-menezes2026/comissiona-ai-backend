import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GoalsService } from './goals.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('goals')
@Controller('goals')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class GoalsController {
  constructor(private svc: GoalsService) {}

  @Get()
  findAll(@Request() req, @Query() q: any) {
    return this.svc.findAll(req.user.tenantId, { ...q, includeInactive: q.includeInactive === 'true' });
  }

  @Get('progress')
  progress(@Request() req, @Query('periodType') periodType: string, @Query('periodKey') periodKey: string) {
    return this.svc.getProgress(req.user.tenantId, periodType || 'monthly', periodKey || new Date().toISOString().slice(0, 7));
  }

  @Get('history')
  history(@Request() req, @Query() q: any) {
    return this.svc.getHistory(req.user.tenantId, {
      periodType: q.periodType || 'monthly',
      periodKey: q.periodKey || new Date().toISOString().slice(0, 7),
      productId: q.productId || undefined,
      sellerId: q.sellerId || undefined,
      count: q.count ? Number(q.count) : undefined,
    });
  }

  @Post() create(@Request() req, @Body() body: any) { return this.svc.create(req.user.tenantId, body); }
  @Patch(':id') update(@Request() req, @Param('id') id: string, @Body() body: any) { return this.svc.update(req.user.tenantId, id, body); }
  @Delete(':id') remove(@Request() req, @Param('id') id: string) { return this.svc.remove(req.user.tenantId, id); }

  @Post(':id/duplicate')
  duplicate(@Request() req, @Param('id') id: string, @Body() body: { periodKeys: string[] }) {
    return this.svc.duplicate(req.user.tenantId, id, body.periodKeys || []);
  }
}
