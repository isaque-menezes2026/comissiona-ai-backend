import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProductsService } from './products.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('products')
@Controller('products')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class ProductsController {
  constructor(private svc: ProductsService) {}

  @Get()
  findAll(@Request() req, @Query('includeInactive') inc: string) {
    return this.svc.findAll(req.user.tenantId, inc === 'true');
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) { return this.svc.findOne(req.user.tenantId, id); }

  @Post()
  create(@Request() req, @Body() body: any) { return this.svc.create(req.user.tenantId, body); }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() body: any) { return this.svc.update(req.user.tenantId, id, body); }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) { return this.svc.remove(req.user.tenantId, id); }
}
