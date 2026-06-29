import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CustomersService } from './customers.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('customers')
@Controller('customers')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class CustomersController {
  constructor(private svc: CustomersService) {}

  @Get() findAll(@Request() req, @Query() q: any) { return this.svc.findAll(req.user.tenantId, q); }
  @Get(':id') findOne(@Request() req, @Param('id') id: string) { return this.svc.findOne(req.user.tenantId, id); }
  @Post() create(@Request() req, @Body() body: any) { return this.svc.create(req.user.tenantId, body); }
  @Patch(':id') update(@Request() req, @Param('id') id: string, @Body() body: any) { return this.svc.update(req.user.tenantId, id, body); }
}
