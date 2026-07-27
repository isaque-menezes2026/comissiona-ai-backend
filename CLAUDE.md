# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é este projeto

Backend do **Comissiona AI**, um SaaS multi-tenant de gestão de comissões comerciais. Este repositório é a API (NestJS + Prisma + PostgreSQL). O frontend é um repositório separado, `comissiona-ai-frontend` (Next.js), que consome esta API via `NEXT_PUBLIC_API_URL`.

Hoje roda com um único tenant real em produção (Support Solutions), mas o modelo de dados e as regras já nascem multi-tenant e configuráveis — nenhuma regra de comissão é hardcoded em código, tudo é linha na tabela `commission_rules`.

## Comandos

```bash
npm run start:dev        # desenvolvimento local, com watch (nest start --watch)
npm run build             # nest build -> dist/
npm run start             # roda o build (node dist/main) — usado em produção fora do Docker
npm run prisma:generate   # gera o Prisma Client a partir de prisma/schema.prisma
npm run prisma:migrate    # prisma migrate deploy (aplica migrations pendentes)
npm run prisma:seed       # ts-node prisma/seed.ts
npm run db:setup          # migrate deploy + seed, em sequência
```

Testes com **Jest + ts-jest** (`npm test`). Config em `jest.config.js`; specs em `*.spec.ts` ao lado do código. Hoje cobrem o mais crítico: deduplicação do motor de comissão (`commission-engine.service.spec.ts`) e o `RolesGuard` (`common/guards/roles.guard.spec.ts`). Specs ficam fora do build de produção via `tsconfig.build.json` (usado pelo `nest build`). Ainda falta cobertura ampla — expandir a partir dessa base.

Swagger fica disponível em `/api/docs` quando o servidor está no ar (montado em `main.ts`).

## ⚠️ Particularidade crítica do deploy (Railway) — leia antes de mexer no Dockerfile

O `Dockerfile` faz o build do TypeScript **dentro do `CMD`, na hora que o container inicia**, não na hora que a imagem Docker é construída:

```dockerfile
CMD ["sh", "-c", "npm run build && node dist/src/main"]
```

Isso significa que **um erro de TypeScript só aparece quando o Railway efetivamente sobe um novo deploy** — a etapa de "build" que aparece como sucesso no Railway é só a construção da imagem Docker (`npm install` + `prisma generate`), não o `tsc`. Um `git push` com erro de tipo entra, a imagem "constrói" com sucesso, e o container crasha em loop *depois*, ao rodar `npm run build && node dist/src/main`.

Consequência prática: ao fazer múltiplos commits em sequência rápida, o Railway cancela/substitui deploys em andamento pelo mais novo — então um erro de tipo num commit intermediário pode nunca aparecer como "crashed" se um commit seguinte já tiver corrigido, mas também pode ficar em produção por minutos antes de alguém perceber. **Sempre verifique o status do deploy final no Railway (aba Deployments) alguns segundos/minutos depois do último commit, não só logo em seguida** — já aconteceu de um deploy aparecer "Online" e, ao checar de novo pouco depois, estar "Crashed".

Se for mexer nisso: o ideal seria mover `tsc`/`nest build` para dentro do build da imagem Docker (`RUN npm run build` antes do `CMD`) e deixar o `CMD` só rodando `node dist/src/main`, pra erros de tipo quebrarem o build da imagem (visível na hora) em vez de crashar em produção. Isso ainda não foi feito — avaliar o risco antes de mudar, pois pode expor migrations pendentes de forma diferente.

## Arquitetura

Monólito modular NestJS, um módulo por domínio em `src/<dominio>/` (controller + service + module). Módulos registrados em `src/app.module.ts`. Prisma Client único (`src/common/prisma/prisma.service.ts`) injetado em todo lugar — sem repositórios intermediários.

**Multi-tenancy é por convenção, não automática.** Não há middleware do Prisma nem RLS do Postgres aplicando o filtro de tenant — cada método de cada service precisa lembrar de filtrar por `tenantId` manualmente em toda query. `TenantGuard` (`src/common/guards/tenant.guard.ts`) só valida que o JWT tem um `tenantId`; não filtra nada sozinho.

**Banco:** PostgreSQL hospedado no Supabase. `DATABASE_URL` aponta pra lá. O schema completo está em `prisma/schema.prisma` — é a fonte de verdade dos campos; não duplicar aqui.

### Autenticação e controle de acesso por papel

- JWT via `passport-jwt` (`src/auth/jwt.strategy.ts`). O `validate()` **rebusca o usuário no banco a cada request** (não confia só no payload do token) e devolve `{ id, tenantId, role, email, sellerId, partnerId, employeeId }` — isso vira `req.user`.
- Papéis (`UserRole` no schema): `ADMIN`, `SALES_MANAGER`, `FINANCIAL` (irrestritos — veem tudo do tenant) e `SELLER`, `PARTNER`, `EMPLOYEE` (restritos aos próprios registros).
- O escopo por papel é centralizado em `src/common/scope.util.ts`: `isRestrictedUser(user)`, `ownerWhere(user)` (monta o `where` do Prisma pra listagens) e `ownsRecord(user, record)` (checagem pontual em `findOne`/`update`). Todo service que precisa restringir dados por vendedor/parceiro/colaborador usa esses helpers — não reinventar a checagem em cada módulo.
- Hoje isso está aplicado em `sales`, `commissions`, `customers`, `goals` e no dashboard de `reports`. Os relatórios gerenciais (ranking, by-seller, by-product, by-period, pending-payments) são bloqueados por completo pra papéis restritos (`ForbiddenException` no controller).
- **Autorização por papel nos endpoints de escrita** já existe via `@Roles(...)` (`common/decorators/roles.decorator.ts`) + `RolesGuard` (`common/guards/roles.guard.ts`). É **opt-in**: endpoint sem `@Roles` não sofre restrição de papel (leituras e fluxos self-service — ex.: vendedor cadastrando a própria venda/cliente — seguem abertos, só escopados por `scope.util`). Grupos prontos em `ROLE_GROUPS`: `MANAGEMENT` (ADMIN/SALES_MANAGER/FINANCIAL — cancelar comissão, process-invoice, registrar pagamento de fatura, CRUD de regras/produtos/metas/pessoas), `FINANCE` (ADMIN/FINANCIAL — criar/aprovar/marcar-pago lote de pagamento; segregação de função) e `ADMIN_ONLY` (config do tenant, criação de usuário, reset de senha). O `RolesGuard` deve vir **depois** do `AuthGuard('jwt')` em `@UseGuards` (ordem importa — precisa de `req.user` populado).

### Motor de comissão (`src/commission-engine/commission-engine.service.ts`)

É o domínio mais importante do sistema. Ideia central: **nenhuma regra de comissão é código** — tudo vem da tabela `commission_rules`, e o motor só sabe interpretar essas regras.

Fluxo (`processSale`):
1. Recebe uma venda (`Sale`) com seus itens (`SaleItem`).
2. Pra cada item, busca regras aplicáveis (`findApplicableRules`): mesmo tenant, ativa, `productId` bate (ou regra genérica com `productId: null`), e a origem da venda bate (`saleOrigin` da regra == origem da venda, ou `'any'`, ou `null`).
   - **Cuidado:** `saleOrigin: null` na regra significa "vale pra qualquer origem". Uma regra pensada só pra vendas de parceiro que fique com `saleOrigin` null por engano passa a valer também pra vendas diretas — isso já causou comissão indevida em produção (ver histórico de commits/patches SQL). Ao criar regra nova, sempre definir `saleOrigin` explicitamente quando ela não deve valer pra "qualquer origem".
   - Regra com `beneficiaryType: PARTNER` só se aplica se a venda tiver `partnerId`; `EMPLOYEE` só se tiver `employeeId`; `SELLER` só se tiver `sellerId`. Venda 100% de parceiro sem vendedor interno não gera nada pro vendedor.
3. Calcula o valor (`calculateCommission`) conforme `commissionType`: percentual sobre implantação, percentual/1ª/3ª mensalidade (todos exigem `item.type` bater com `IMPLANTATION`/`MONTHLY`), ou `FIXED_AMOUNT` (valor fixo — só desconta imposto se for beneficiário `PARTNER` e a regra tiver `appliesOnNetAmount`).
   - **Comissão fixa por venda (corrigido):** regras `FIXED_AMOUNT` deduplicam por `(tenantId, saleId, ruleId)` ignorando o `saleItemId` — uma venda com 2 itens do mesmo produto gera a comissão fixa **uma vez só**. Regras percentuais e de mensalidade continuam por item (dedupe inclui `saleItemId`). Ver a checagem em `processItem` e o teste em `commission-engine.service.spec.ts`. (Antes o motor avaliava fixo por item, gerando duplicata — resolvida manualmente via SQL.)
4. Grava `Commission` com status inicial (`resolveInitialStatus`) e uma previsão de recebimento (`calculateForecast`): datas estimadas de faturamento/pagamento/liberação e a competência prevista, baseadas em `appliesAfterDays` da regra (padrão 90 dias pra 3ª mensalidade, 30 pra 1ª mensalidade/implantação, 15 pra valor fixo).

Ciclo de vida do `CommissionStatus`: `PREDICTED` → (`BLOCKED` se a regra exige aprovação manual) → `RELEASED` (quando `processInvoicePaid` confirma o gatilho certo — 1ª fatura, 3ª fatura, qualquer fatura, ou aprovação manual) → `PAID` (marcado manualmente na tela de Comissões) ou `CANCELLED`/`REVERSED`.

Métodos de manutenção pontual expostos via endpoints (chamados por botões na tela de Comissões do frontend): `restrictRecurringRulesToDirectOrigin`, `reconcilePendingCommissions`, `refreshForecastText`. Não são cron jobs — rodam sob demanda quando alguém clica no botão correspondente.

### Integrações externas (`src/integrations/`)

Endpoints server-to-server pra sistemas externos (hoje: `kualiz-portal`, que gera propostas/contratos) criarem vendas, clientes e vendedores no Comissiona automaticamente. Autenticação é por header `x-integration-key` comparado com `INTEGRATION_API_KEY` (`IntegrationKeyGuard`) — **não** usa JWT de usuário. A chave precisa estar configurada igual nos dois lados (variável de ambiente do sistema externo e do Comissiona); mismatch é uma causa comum de erro "Chave de integração inválida" (o guard loga um mascaramento da chave recebida vs. esperada pra facilitar diagnosticar espaço/quebra de linha a mais).

`EXTERNAL_PRODUCT_KEY_MAP` em `integrations.service.ts` mapeia os códigos de produto do sistema externo pros nomes exatos cadastrados no Comissiona; há um fallback por nome normalizado (`resolveProductId`) pra quando o portal manda um produto novo que ainda não está no mapa.

## Variáveis de ambiente (produção, Railway)

O `.env.example` do repo está incompleto. As variáveis realmente usadas no código são:

| Variável | Uso |
|---|---|
| `DATABASE_URL` | conexão Postgres (Supabase) |
| `JWT_SECRET` | assinatura dos tokens de acesso |
| `PORT` | porta do servidor (Railway injeta automaticamente) |
| `FRONTEND_URL` | usada para montar o link de redefinição de senha no e-mail |
| `RESEND_API_KEY` | envio de e-mail transacional (Resend). Sem ela, o backend **não falha** — só loga o link de redefinição de senha no console em vez de enviar e-mail |
| `RESEND_FROM_EMAIL` | remetente do e-mail de redefinição (padrão: `Comissiona AI <onboarding@resend.dev>`) |
| `INTEGRATION_API_KEY` | chave que o `kualiz-portal` (e outros sistemas externos) usa no header `x-integration-key` pra criar vendas/clientes via `/integrations/*` |

## `prisma/seed.ts` não é fonte de verdade do estado atual

O seed cria o tenant, produtos, admin e regras de comissão *na primeira vez* que roda (é idempotente via `findFirst`/`findUnique`, não sobrescreve o que já existe). Mas o banco de produção já foi editado diretamente por SQL várias vezes desde então (troca de e-mail do admin, correção de `saleOrigin` de regras, cancelamento de comissões indevidas etc.), então **o conteúdo do seed pode estar desatualizado em relação ao que está realmente em produção** (ex: o seed ainda define uma regra de R$50 fixo pro vendedor em venda de parceiro do Klingo, enquanto a regra real em produção hoje é R$80). Não rodar `db:setup`/`prisma:seed` em produção assumindo que ele reflete o estado atual — sempre conferir a tabela `commission_rules` direto no banco antes de mudar algo relacionado a regras.
