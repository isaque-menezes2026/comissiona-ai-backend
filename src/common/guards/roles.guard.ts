// src/common/guards/roles.guard.ts
// Autorização por papel. Lê os papéis exigidos via @Roles (nível de método ou
// classe). Se o endpoint não declara @Roles, libera (controle opt-in). Deve rodar
// DEPOIS do AuthGuard('jwt'), que popula req.user — a ordem em @UseGuards garante
// isso: @UseGuards(AuthGuard('jwt'), RolesGuard).

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Endpoint sem @Roles: sem restrição de papel.
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const role = req.user?.role;

    if (!role || !requiredRoles.includes(role)) {
      throw new ForbiddenException(
        'Seu papel não tem permissão para esta ação.',
      );
    }
    return true;
  }
}
