import { ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard';

// Contextos/reflector falsos — o guard só depende de getAllAndOverride e req.user.
function ctx(user: any): any {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => 'handler',
    getClass: () => 'class',
  };
}
function reflector(roles: string[] | undefined): any {
  return { getAllAndOverride: () => roles };
}

describe('RolesGuard', () => {
  it('libera endpoint sem @Roles (controle é opt-in)', () => {
    const guard = new RolesGuard(reflector(undefined));
    expect(guard.canActivate(ctx({ role: 'SELLER' }))).toBe(true);
  });

  it('libera endpoint com @Roles vazio', () => {
    const guard = new RolesGuard(reflector([]));
    expect(guard.canActivate(ctx({ role: 'SELLER' }))).toBe(true);
  });

  it('libera quando o papel do usuário está na lista exigida', () => {
    const guard = new RolesGuard(reflector(['ADMIN', 'FINANCIAL']));
    expect(guard.canActivate(ctx({ role: 'FINANCIAL' }))).toBe(true);
  });

  it('bloqueia quando o papel não está na lista exigida', () => {
    const guard = new RolesGuard(reflector(['ADMIN', 'FINANCIAL']));
    expect(() => guard.canActivate(ctx({ role: 'SELLER' }))).toThrow(ForbiddenException);
  });

  it('bloqueia quando não há usuário/papel no request', () => {
    const guard = new RolesGuard(reflector(['ADMIN']));
    expect(() => guard.canActivate(ctx(undefined))).toThrow(ForbiddenException);
  });
});
