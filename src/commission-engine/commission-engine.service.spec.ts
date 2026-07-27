import { CommissionType, TriggerEvent, BeneficiaryType } from '@prisma/client';
import { CommissionEngineService } from './commission-engine.service';

// Mock de Prisma "stateful": guarda as comissões criadas em memória e faz o
// findFirst casar por igualdade em cada chave do where — exatamente como o
// Prisma faz numa cláusula where simples. Assim o teste exercita a lógica real
// de deduplicação do motor, não uma reimplementação.
function makePrisma(sale: any, rules: any[]) {
  const created: any[] = [];
  return {
    created,
    sale: { findUnique: jest.fn().mockResolvedValue(sale) },
    commissionRule: { findMany: jest.fn().mockResolvedValue(rules) },
    commission: {
      findFirst: jest.fn(async ({ where }: any) =>
        created.find((c) => Object.keys(where).every((k) => c[k] === where[k])) || null,
      ),
      create: jest.fn(async ({ data }: any) => {
        created.push(data);
        return data;
      }),
    },
  };
}

function buildScenario() {
  const item = (id: string) => ({
    id,
    productId: 'prod-1',
    type: 'IMPLANTATION',
    netValue: 1000,
    taxRate: 0.1,
  });

  const sale = {
    id: 'sale-1',
    tenantId: 'tenant-1',
    origin: 'direct',
    sellerId: 'seller-1',
    partnerId: null,
    employeeId: null,
    taxRate: 0.1,
    saleDate: new Date('2026-01-01'),
    billingStartDate: null,
    contractDate: null,
    // Venda com DOIS itens do mesmo produto — o caso que duplicava a comissão fixa.
    items: [item('item-1'), item('item-2')],
  };

  const base = {
    tenantId: 'tenant-1',
    productId: 'prod-1',
    beneficiaryType: BeneficiaryType.SELLER,
    saleOrigin: null,
    active: true,
    startDate: null,
    endDate: null,
    appliesOnNetAmount: true,
    requiresManagerApproval: false,
  };

  const rules = [
    { ...base, id: 'rule-fixed', commissionType: CommissionType.FIXED_AMOUNT, fixedAmount: 80, percentage: null, triggerEvent: TriggerEvent.FIRST_INVOICE_PAID, appliesAfterDays: 30 },
    { ...base, id: 'rule-pct', commissionType: CommissionType.PERCENTAGE_IMPLANTATION, fixedAmount: null, percentage: 8, triggerEvent: TriggerEvent.INVOICE_PAID, appliesAfterDays: 30 },
  ];

  return { sale, rules };
}

function makeService(prisma: any) {
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  return new CommissionEngineService(prisma as any, audit as any);
}

describe('CommissionEngineService.processSale — deduplicação', () => {
  it('gera a comissão FIXED_AMOUNT uma única vez por venda, mesmo com 2 itens do mesmo produto', async () => {
    const { sale, rules } = buildScenario();
    const prisma = makePrisma(sale, rules);
    const svc = makeService(prisma);

    await svc.processSale({ tenantId: 'tenant-1', saleId: 'sale-1', triggeredBy: 'user-1' });

    const fixed = prisma.created.filter((c) => c.ruleId === 'rule-fixed');
    const pct = prisma.created.filter((c) => c.ruleId === 'rule-pct');

    // Antes do fix: 2 comissões fixas (uma por item). Agora: exatamente 1.
    expect(fixed).toHaveLength(1);
    expect(Number(fixed[0].amount)).toBe(80);
    // Regras percentuais continuam sendo POR ITEM: uma para cada saleItem.
    expect(pct).toHaveLength(2);
    expect(new Set(pct.map((c) => c.saleItemId))).toEqual(new Set(['item-1', 'item-2']));
  });

  it('é idempotente: reprocessar a mesma venda não cria comissões duplicadas', async () => {
    const { sale, rules } = buildScenario();
    const prisma = makePrisma(sale, rules);
    const svc = makeService(prisma);

    await svc.processSale({ tenantId: 'tenant-1', saleId: 'sale-1' });
    const afterFirst = prisma.created.length; // 1 fixa + 2 percentuais = 3
    await svc.processSale({ tenantId: 'tenant-1', saleId: 'sale-1' });

    expect(afterFirst).toBe(3);
    expect(prisma.created).toHaveLength(3);
  });
});
