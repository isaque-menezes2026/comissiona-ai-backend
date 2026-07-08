import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

// Guard simples de chave de API para chamadas server-to-server vindas de
// sistemas externos (ex: kualiz-portal). Não usa JWT/tenant do usuário logado —
// a chave fica só nas variáveis de ambiente dos dois backends, nunca no browser.
@Injectable()
export class IntegrationKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const key = req.headers['x-integration-key'];
    const expected = process.env.INTEGRATION_API_KEY;
    if (!expected) {
      throw new UnauthorizedException('Integração não configurada (INTEGRATION_API_KEY ausente).');
    }
    if (!key || key !== expected) {
      throw new UnauthorizedException('Chave de integração inválida.');
    }
    return true;
  }
}
