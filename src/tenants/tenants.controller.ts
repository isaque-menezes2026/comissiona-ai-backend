import { Controller, Get, Patch, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TenantsService } from './tenants.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('tenants')
@Controller('tenants')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class TenantsController {
  constructor(private svc: TenantsService) {}

  @Get('me')
  getMe(@Request() req) { return this.svc.findOne(req.user.tenantId); }

  @Patch('me')
  update(@Request() req, @Body() body: any) { return this.svc.update(req.user.tenantId, body); }

  @Get('users')
  getUsers(@Request() req) { return this.svc.getUsers(req.user.tenantId); }

  @Post('users')
  createUser(@Request() req, @Body() body: any) { return this.svc.createUser(req.user.tenantId, body); }

  @Get('dashboard')
  dashboard(@Request() req) { return this.svc.getDashboardStats(req.user.tenantId); }
}
