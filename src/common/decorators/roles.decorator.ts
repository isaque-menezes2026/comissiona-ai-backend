// src/common/decorators/roles.decorator.ts
// Declara quais papéis (UserRole) podem acessar um endpoint. Usado em conjunto
// com o RolesGuard (src/common/guards/roles.guard.ts). Endpoints SEM @Roles não
// sofrem restrição de papel — só a autenticação/tenant já aplicadas. Assim o
// controle é opt-in: leituras e fluxos self-service (ex.: vendedor cadastrando a
// própria venda) continuam abertos; só as ações de gestão/financeiro são travadas.

import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

// Grupos de papéis reutilizáveis, alinhados com src/common/scope.util.ts.
// MANAGEMENT = papéis irrestritos (veem/gerenciam tudo do tenant).
// FINANCE = movimentação de dinheiro (lotes de pagamento) — segregação de função.
export const ROLE_GROUPS = {
  MANAGEMENT: ['ADMIN', 'SALES_MANAGER', 'FINANCIAL'] as const,
  FINANCE: ['ADMIN', 'FINANCIAL'] as const,
  ADMIN_ONLY: ['ADMIN'] as const,
};

export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
