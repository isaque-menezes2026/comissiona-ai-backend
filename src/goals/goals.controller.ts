import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GoalsService } from './goals.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('goals')
@Controller('goals')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class GoalsController {
  constructor(private svc: GoalsService) {}

  @Get() findAll(@Request() req, @Query('month') month: string) { return this.svc.findAll(req.user.tenantId, month); }
  @Get('progress') progress(@Request() req, @Query('month') month: string) {
    return this.svc.getProgress(req.user.tenantId, month || new Date().toISOString().slice(0, 7));
  }
  @Post() create(@Request() req, @Body() body: any) { return this.svc.create(req.user.tenantId, body); }
  @Patch(':id') update(@Request() req, @Param('id') id: string, @Body() body: any) { return this.svc.update(req.user.tenantId, id, body); }
}
