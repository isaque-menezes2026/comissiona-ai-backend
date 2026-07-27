import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GoalsService } from './goals.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, ROLE_GROUPS } from '../common/decorators/roles.decorator';

@ApiTags('goals')
@Controller('goals')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class GoalsController {
  constructor(private svc: GoalsService) {}

  @Get()
  findAll(@Request() req, @Query() q: any) {
    return this.svc.findAll(req.user.tenantId, q, req.user);
  }

  @Get('progress')
  progress(@Request() req, @Query('periodType') periodType: string, @Query('periodKey') periodKey: string) {
    return this.svc.getProgress(req.user.tenantId, periodType || 'monthly', periodKey || new Date().toISOString().slice(0, 7), req.user);
  }

  @Post() @Roles(...ROLE_GROUPS.MANAGEMENT) create(@Request() req, @Body() body: any) { return this.svc.create(req.user.tenantId, body); }
  @Patch(':id') @Roles(...ROLE_GROUPS.MANAGEMENT) update(@Request() req, @Param('id') id: string, @Body() body: any) { return this.svc.update(req.user.tenantId, id, body); }
  @Delete(':id') @Roles(...ROLE_GROUPS.MANAGEMENT) remove(@Request() req, @Param('id') id: string) { return this.svc.remove(req.user.tenantId, id); }
}
