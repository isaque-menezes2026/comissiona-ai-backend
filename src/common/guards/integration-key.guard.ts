import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';

// Guard simples de chave de API para chamadas server-to-server vindas de
// sistemas externos (ex: kualiz-portal). Não usa JWT/tenant do usuário logado —
// a chave fica só nas variáveis de ambiente dos dois backends, nunca no browser.
@Injectable()
export class IntegrationKeyGuard implements CanActivate {
  private readonly logger = new Logger(IntegrationKeyGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const key = req.headers['x-integration-key'];
    const expected = process.env.INTEGRATION_API_KEY;
    if (!expected) {
      throw new UnauthorizedException('Integração não configurada (INTEGRATION_API_KEY ausente).');
    }
    if (!key || key !== expected) {
      // Nunca loga a chave em texto puro. Loga só tamanho/prefixo mascarado dos dois
      // lados pra dar pra diagnosticar mismatch (espaço a mais, chave desatualizada
      // num dos dois ambientes) direto pelos logs do Railway, sem expor o segredo.
      this.logger.warn(
        `Chave de integração recusada em ${req.method} ${req.originalUrl || req.url}. ` +
        `Recebida: ${this.mask(key)} | Esperada: ${this.mask(expected)}`,
      );
      throw new UnauthorizedException('Chave de integração inválida.');
    }
    return true;
  }

  private mask(value: unknown): string {
    if (typeof value !== 'string' || value.length === 0) return '(ausente)';
    const trimmed = value.trim();
    const trimNote = trimmed.length !== value.length ? ' [tinha espaço/quebra de linha nas pontas!]' : '';
    if (trimmed.length <= 6) return `"${trimmed[0]}***" (len=${trimmed.length})${trimNote}`;
    return `"${trimmed.slice(0, 3)}...${trimmed.slice(-3)}" (len=${trimmed.length})${trimNote}`;
  }
}
