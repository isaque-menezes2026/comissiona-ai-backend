import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PeopleService } from './people.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, ROLE_GROUPS } from '../common/decorators/roles.decorator';

@ApiTags('people')
@Controller('people')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class PeopleController {
  constructor(private svc: PeopleService) {}

  @Get('sellers') findSellers(@Request() req) { return this.svc.findAllSellers(req.user.tenantId); }
  @Post('sellers') @Roles(...ROLE_GROUPS.MANAGEMENT) createSeller(@Request() req, @Body() body: any) { return this.svc.createSeller(req.user.tenantId, body); }
  @Patch('sellers/:id') @Roles(...ROLE_GROUPS.MANAGEMENT) updateSeller(@Request() req, @Param('id') id: string, @Body() body: any) { return this.svc.updateSeller(req.user.tenantId, id, body); }
  @Delete('sellers/:id') @Roles(...ROLE_GROUPS.MANAGEMENT) removeSeller(@Request() req, @Param('id') id: string) { return this.svc.removeSeller(req.user.tenantId, id); }

  @Get('partners') findPartners(@Request() req) { return this.svc.findAllPartners(req.user.tenantId); }
  @Post('partners') @Roles(...ROLE_GROUPS.MANAGEMENT) createPartner(@Request() req, @Body() body: any) { return this.svc.createPartner(req.user.tenantId, body); }
  @Patch('partners/:id') @Roles(...ROLE_GROUPS.MANAGEMENT) updatePartner(@Request() req, @Param('id') id: string, @Body() body: any) { return this.svc.updatePartner(req.user.tenantId, id, body); }
  @Delete('partners/:id') @Roles(...ROLE_GROUPS.MANAGEMENT) removePartner(@Request() req, @Param('id') id: string) { return this.svc.removePartner(req.user.tenantId, id); }

  @Get('employees') findEmployees(@Request() req) { return this.svc.findAllEmployees(req.user.tenantId); }
  @Post('employees') @Roles(...ROLE_GROUPS.MANAGEMENT) createEmployee(@Request() req, @Body() body: any) { return this.svc.createEmployee(req.user.tenantId, body); }
  @Patch('employees/:id') @Roles(...ROLE_GROUPS.MANAGEMENT) updateEmployee(@Request() req, @Param('id') id: string, @Body() body: any) { return this.svc.updateEmployee(req.user.tenantId, id, body); }
  @Delete('employees/:id') @Roles(...ROLE_GROUPS.MANAGEMENT) removeEmployee(@Request() req, @Param('id') id: string) { return this.svc.removeEmployee(req.user.tenantId, id); }

  @Get('ranking') getRanking(@Request() req, @Query('month') month: string) {
    return this.svc.getRanking(req.user.tenantId, month || new Date().toISOString().slice(0, 7));
  }

  @Get('users') findUsers(@Request() req) { return this.svc.findAllUsers(req.user.tenantId); }

  @Patch('users/:id/reset-password')
  @Roles(...ROLE_GROUPS.ADMIN_ONLY)
  resetPassword(@Request() req, @Param('id') id: string, @Body() body: { newPassword: string }) {
    return this.svc.resetUserPassword(req.user.tenantId, id, body.newPassword);
  }
}
