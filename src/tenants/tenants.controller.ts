import { Controller, Get, Patch, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TenantsService } from './tenants.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, ROLE_GROUPS } from '../common/decorators/roles.decorator';

@ApiTags('tenants')
@Controller('tenants')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class TenantsController {
  constructor(private svc: TenantsService) {}

  @Get('me')
  getMe(@Request() req) { return this.svc.findOne(req.user.tenantId); }

  @Patch('me')
  @Roles(...ROLE_GROUPS.ADMIN_ONLY)
  update(@Request() req, @Body() body: any) { return this.svc.update(req.user.tenantId, body); }

  @Get('users')
  getUsers(@Request() req) { return this.svc.getUsers(req.user.tenantId); }

  @Post('users')
  @Roles(...ROLE_GROUPS.ADMIN_ONLY)
  createUser(@Request() req, @Body() body: any) { return this.svc.createUser(req.user.tenantId, body); }

  @Get('dashboard')
  dashboard(@Request() req) { return this.svc.getDashboardStats(req.user.tenantId); }
}
