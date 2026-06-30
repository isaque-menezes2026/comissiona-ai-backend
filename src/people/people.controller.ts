import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PeopleService } from './people.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('people')
@Controller('people')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class PeopleController {
  constructor(private svc: PeopleService) {}

  @Get('sellers') findSellers(@Request() req) { return this.svc.findAllSellers(req.user.tenantId); }
  @Post('sellers') createSeller(@Request() req, @Body() body: any) { return this.svc.createSeller(req.user.tenantId, body); }
  @Patch('sellers/:id') updateSeller(@Request() req, @Param('id') id: string, @Body() body: any) { return this.svc.updateSeller(req.user.tenantId, id, body); }

  @Get('partners') findPartners(@Request() req) { return this.svc.findAllPartners(req.user.tenantId); }
  @Post('partners') createPartner(@Request() req, @Body() body: any) { return this.svc.createPartner(req.user.tenantId, body); }
  @Patch('partners/:id') updatePartner(@Request() req, @Param('id') id: string, @Body() body: any) { return this.svc.updatePartner(req.user.tenantId, id, body); }

  @Get('employees') findEmployees(@Request() req) { return this.svc.findAllEmployees(req.user.tenantId); }
  @Post('employees') createEmployee(@Request() req, @Body() body: any) { return
this.svc.createEmployee(req.user.tenantId, body); }
  @Patch('employees/:id') updateEmployee(@Request() req, @Param('id') id: string, @Body() body: any) { return this.svc.updateEmployee(req.user.tenantId, id, body); }

  @Get('ranking') getRanking(@Request() req, @Query('month') month: string) {
    return this.svc.getRanking(req.user.tenantId, month || new Date().toISOString().slice(0, 7));
  }

  @Get('users') findUsers(@Request() req) { return this.svc.findAllUsers(req.user.tenantId); }

  @Patch('users/:id/reset-password')
  resetPassword(@Request() req, @Param('id') id: string, @Body() body: { newPassword: string }) {
    if (req.user.role !== 'ADMIN') throw new ForbiddenException('Apenas administradores podem redefinir senhas de outros usuários');
    return this.svc.resetUserPassword(req.user.tenantId, id, body.newPassword);
  }
}
