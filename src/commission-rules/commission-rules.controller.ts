import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CommissionRulesService } from './commission-rules.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('commission-rules')
@Controller('commission-rules')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class CommissionRulesController {
  constructor(private svc: CommissionRulesService) {}

  @Get() findAll(@Request() req) { return this.svc.findAll(req.user.tenantId); }
  @Get(':id') findOne(@Request() req, @Param('id') id: string) { return this.svc.findOne(req.user.tenantId, id); }
  @Post() create(@Request() req, @Body() body: any) { return this.svc.create(req.user.tenantId, body, req.user.id); }
  @Patch(':id') update(@Request() req, @Param('id') id: string, @Body() body: any) { return this.svc.update(req.user.tenantId, id, body, req.user.id); }
  @Delete(':id') remove(@Request() req, @Param('id') id: string) { return this.svc.remove(req.user.tenantId, id, req.user.id); }
}
