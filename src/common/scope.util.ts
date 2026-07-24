// src/common/scope.util.ts
// Helpers para restringir o acesso de vendedores, parceiros e colaboradores
// aos proprios registros (vendas, comissoes, clientes, metas). Admin, Gestor
// Comercial e Financeiro continuam enxergando tudo do tenant.

export interface RequestUser {
  id?: string;
  tenantId?: string;
  role?: string;
  sellerId?: string | null;
  partnerId?: string | null;
  employeeId?: string | null;
}

const UNRESTRICTED_ROLES = ['ADMIN', 'SALES_MANAGER', 'FINANCIAL'];

/** true se o usuario so pode ver os proprios registros (seller/partner/employee) */
export function isRestrictedUser(user?: RequestUser): boolean {
  if (!user || !user.role) return false;
  return !UNRESTRICTED_ROLES.includes(user.role);
}

/**
 * Filtro Prisma "where" que restringe a consulta aos registros do proprio
 * usuario, de acordo com o papel dele. Retorna {} (sem restricao) para
 * admin/gestor/financeiro ou quando o usuario nao e informado.
 */
export function ownerWhere(user?: RequestUser): Record<string, any> {
  if (!isRestrictedUser(user)) return {};
  if (user!.role === 'SELLER') return { sellerId: user!.sellerId || '__none__' };
  if (user!.role === 'PARTNER') return { partnerId: user!.partnerId || '__none__' };
  if (user!.role === 'EMPLOYEE') return { employeeId: user!.employeeId || '__none__' };
  return { id: '__none__' };
}

/**
 * Verifica se um registro ja carregado (venda, comissao, cliente...)
 * pertence ao usuario -- usado em findOne para nao vazar registros de outra
 * pessoa mesmo sabendo o ID exato.
 */
export function ownsRecord(
  user: RequestUser | undefined,
  record: { sellerId?: string | null; partnerId?: string | null; employeeId?: string | null },
): boolean {
  if (!isRestrictedUser(user)) return true;
  if (user!.role === 'SELLER') return !!record.sellerId && record.sellerId === user!.sellerId;
  if (user!.role === 'PARTNER') return !!record.partnerId && record.partnerId === user!.partnerId;
  if (user!.role === 'EMPLOYEE') return !!record.employeeId && record.employeeId === user!.employeeId;
  return false;
}
