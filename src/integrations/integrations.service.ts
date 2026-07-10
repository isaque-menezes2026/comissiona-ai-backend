import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { SalesService } from '../sales/sales.service';
import { UserRole } from '@prisma/client';

// Mapa de tipos de item vindos de sistemas externos (ex: proposal_items.item_type
// do kualiz-portal) para o nome exato do produto cadastrado no Comissiona.
// Mantido por nome (não por id) para não depender de ids frágeis entre ambientes.
export const EXTERNAL_PRODUCT_KEY_MAP: Record<string, string> = {
  KUALIZ_BASE: 'Kualiz Omnichannel',
  KUALIZ_LITE: 'Kualiz Omnichannel',
  CRM: 'Kualiz CRM',
  TELEPHONY: 'Kualiz PABX',
  AI_ATTENDANCE: 'Kualiz IA de Atendimento',
  API: 'Kualiz API',
  API_INTEGRATION: 'Kualiz API',
  AI_KLINGO: 'Kualiz IA Marcacao Cons/Ex Klingo',
  KLINGO: 'Klingo',
};

// Códigos de origem que o motor de comissão (commission_rules.saleOrigin) e a tela
// de Vendas realmente reconhecem. Se o sistema externo mandar qualquer coisa fora
// dessa lista (ex: um texto livre tipo "Indicação do Fulano - Clínica X"), a venda
// era criada só com esse texto no origin e NENHUMA regra batia — nem a do vendedor,
// que deveria sair sempre.
const KNOWN_ORIGINS = [
  'direct', 'partner', 'employee', 'upsell', 'crosssell',
  'inbound', 'outbound', 'campaign', 'referral', 'event',
];

export interface ExternalSaleItemDto {
  productKey?: string; // uma das chaves de EXTERNAL_PRODUCT_KEY_MAP
  productId?: string; // ou o id direto do produto (via GET /integrations/products)
  type: 'IMPLANTATION' | 'MONTHLY' | 'ONE_TIME' | 'ANNUAL';
  grossValue: number;
  quantity?: number;
  notes?: string;
}

export interface ExternalCustomerDto {
  externalId?: string; // id do registro na origem (ex: client.id do kualiz-portal), só para rastreio
  legalName: string;
  tradeName?: string;
  document?: string;
  segment?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  origin?: string;
  notes?: string;
}

export interface ExternalSellerDto {
  externalId?: string;
  name: string;
  email: string;
  role?: string;
  active?: boolean;
}

export interface ExternalSaleDto {
  source: string; // ex: 'kualiz-portal'
  externalRef?: string; // ex: proposal_code, para rastreabilidade nas notas
  client: {
    legalName: string;
    tradeName?: string;
    document?: string;
    email?: string;
    phone?: string;
    city?: string;
    state?: string;
  };
  sellerEmail?: string;
  sellerId?: string;
  origin?: string;
  taxRate: number; // percentual, ex: 10 = 10%
  saleDate: string;
  contractDate?: string;
  contractUrl?: string; // link do PDF do contrato gerado no sistema externo (ex: kualiz-portal)
  notes?: string;
  items: ExternalSaleItemDto[];
}

@Injectable()
export class IntegrationsService {
  constructor(
    private prisma: PrismaService,
    private salesService: SalesService,
  ) {}

  private async getTenantId(): Promise<string> {
    const tenant = await this.prisma.tenant.findFirst();
    if (!tenant) throw new NotFoundException('Nenhum tenant configurado no Comissiona.');
    return tenant.id;
  }

  private async getSystemUserId(tenantId: string): Promise<string | undefined> {
    const admin = await this.prisma.user.findFirst({ where: { tenantId, role: UserRole.ADMIN } });
    return admin?.id;
  }

  async listSellers() {
    const tenantId = await this.getTenantId();
    return this.prisma.seller.findMany({
      where: { tenantId, active: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });
  }

  async listProducts() {
    const tenantId = await this.getTenantId();
    return this.prisma.product.findMany({
      where: { tenantId, active: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async convertExternalSale(dto: ExternalSaleDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('A venda precisa de pelo menos um item.');
    }
    if (dto.taxRate === undefined || dto.taxRate === null) {
      throw new BadRequestException('Informe o percentual de imposto (taxRate) da venda.');
    }

    const tenantId = await this.getTenantId();

    // Vendedor: por id direto (escolhido manualmente na tela de revisão) ou por e-mail
    let sellerId = dto.sellerId;
    if (!sellerId) {
      if (!dto.sellerEmail) {
        throw new BadRequestException('Informe sellerId ou sellerEmail.');
      }
      const seller = await this.prisma.seller.findFirst({
        where: { tenantId, email: { equals: dto.sellerEmail, mode: 'insensitive' } },
      });
      if (!seller) {
        throw new BadRequestException(
          `Vendedor não encontrado no Comissiona para o e-mail "${dto.sellerEmail}". Use GET /integrations/sellers para escolher manualmente e envie sellerId.`,
        );
      }
      sellerId = seller.id;
    }

    // Cliente: tenta achar por documento (CNPJ/CPF), depois por nome; senão cria novo
    let customer = dto.client.document
      ? await this.prisma.customer.findFirst({ where: { tenantId, document: dto.client.document } })
      : null;

    if (!customer && dto.client.legalName) {
      customer = await this.prisma.customer.findFirst({
        where: { tenantId, companyName: { equals: dto.client.legalName, mode: 'insensitive' } },
      });
    }

    if (!customer) {
      customer = await this.prisma.customer.create({
        data: {
          tenantId,
          companyName: dto.client.legalName,
          tradeName: dto.client.tradeName,
          document: dto.client.document,
          email: dto.client.email,
          phone: dto.client.phone,
          city: dto.client.city,
          state: dto.client.state,
          origin: KNOWN_ORIGINS.includes(dto.origin || '') ? dto.origin : 'direct',
          sellerId,
        },
      });
    }

    // Resolve productId de cada item (por id direto ou por chave mapeada)
    const items: Array<{
      productId: string;
      type: 'IMPLANTATION' | 'MONTHLY' | 'ONE_TIME' | 'ANNUAL';
      grossValue: number;
      quantity: number;
      notes?: string;
    }> = [];

    for (const item of dto.items) {
      let productId = item.productId;
      if (!productId) {
        const key = item.productKey ? EXTERNAL_PRODUCT_KEY_MAP[item.productKey] : undefined;
        if (!key) {
          throw new BadRequestException(`Item sem productId/productKey válido: ${JSON.stringify(item)}`);
        }
        const product = await this.prisma.product.findFirst({ where: { tenantId, name: key } });
        if (!product) {
          throw new BadRequestException(`Produto "${key}" não encontrado no Comissiona.`);
        }
        productId = product.id;
      }
      items.push({
        productId,
        type: item.type,
        grossValue: item.grossValue,
        quantity: item.quantity || 1,
        notes: item.notes,
      });
    }

    const systemUserId = await this.getSystemUserId(tenantId);

    // Normaliza a origem: se o sistema externo mandou um texto livre (ex: descrevendo
    // quem indicou a venda) em vez de um dos códigos que o motor de comissão reconhece,
    // NÃO deixa esse texto virar o origin (senão nenhuma regra bate e a venda fica sem
    // nenhuma comissão, nem a do vendedor). Trata como venda direta pra garantir que a
    // comissão do vendedor seja calculada, e guarda o texto original nas notas pra quem
    // for revisar avaliar se tem indicador (parceiro/colaborador) pra cadastrar depois.
    let saleOrigin = dto.origin || 'direct';
    let unrecognizedOriginNote: string | undefined;
    if (!KNOWN_ORIGINS.includes(saleOrigin)) {
      unrecognizedOriginNote = `⚠️ Origem enviada pelo ${dto.source || 'sistema externo'} não reconhecida: "${saleOrigin}" — tratada como venda direta pra não perder a comissão do vendedor. Revisar se há parceiro/colaborador indicador a cadastrar.`;
      saleOrigin = 'direct';
    }

    const originNote =
      dto.source && dto.externalRef ? `Origem: ${dto.source} — ${dto.externalRef}` : dto.source || undefined;
    const notes = [dto.notes, originNote, unrecognizedOriginNote].filter(Boolean).join(' | ') || undefined;

    const sale = await this.salesService.create(
      tenantId,
      {
        customerId: customer.id,
        sellerId,
        origin: saleOrigin,
        taxRate: dto.taxRate,
        saleDate: dto.saleDate,
        contractDate: dto.contractDate,
        contractFileUrl: dto.contractUrl,
        notes,
        items,
      },
      (systemUserId as string) || 'system',
    );

    return { saleId: sale.id, customerId: customer.id, sellerId };
  }

  // Sincronização automática: cliente criado/editado em sistema externo (ex: kualiz-portal)
  // vira Customer no Comissiona. Faz upsert (match por documento, senão por nome) para que
  // criações e edições cheguem no mesmo lugar sem duplicar.
  async upsertCustomer(dto: ExternalCustomerDto) {
    if (!dto.legalName) {
      throw new BadRequestException('legalName é obrigatório.');
    }
    const tenantId = await this.getTenantId();

    let customer = dto.document
      ? await this.prisma.customer.findFirst({ where: { tenantId, document: dto.document } })
      : null;

    if (!customer) {
      customer = await this.prisma.customer.findFirst({
        where: { tenantId, companyName: { equals: dto.legalName, mode: 'insensitive' } },
      });
    }

    const data = {
      tenantId,
      companyName: dto.legalName,
      tradeName: dto.tradeName,
      document: dto.document,
      segment: dto.segment,
      email: dto.email,
      phone: dto.phone,
      city: dto.city,
      state: dto.state,
      origin: KNOWN_ORIGINS.includes(dto.origin || '') ? dto.origin : 'direct',
      notes: dto.notes,
    };

    if (customer) {
      customer = await this.prisma.customer.update({ where: { id: customer.id }, data });
      return { customerId: customer.id, action: 'updated' as const };
    }
    customer = await this.prisma.customer.create({ data });
    return { customerId: customer.id, action: 'created' as const };
  }

  // Sincronização automática: usuário (vendedor/equipe) criado/editado em sistema externo
  // vira Seller no Comissiona. Upsert por (tenantId, email), que já é chave única no schema.
  async upsertSeller(dto: ExternalSellerDto) {
    if (!dto.name || !dto.email) {
      throw new BadRequestException('name e email são obrigatórios.');
    }
    const tenantId = await this.getTenantId();
    const active = dto.active ?? true;

    const seller = await this.prisma.seller.upsert({
      where: { tenantId_email: { tenantId, email: dto.email } },
      update: {
        name: dto.name,
        role: dto.role,
        active,
        status: active ? 'active' : 'inactive',
      },
      create: {
        tenantId,
        name: dto.name,
        email: dto.email,
        role: dto.role,
        active,
        status: active ? 'active' : 'inactive',
      },
    });

    return { sellerId: seller.id, action: 'upserted' as const };
  }

  // Atualiza o link do contrato assinado numa venda já existente. Cobre o caso em
  // que o arquivo é anexado no sistema externo DEPOIS da venda já ter sido convertida
  // (a chamada original de convertExternalSale só manda o link se ele já existir
  // naquele momento). Usado por POST /integrations/external-sale/:saleId/contract-file.
  async attachContractFile(saleId: string, contractUrl: string) {
    if (!contractUrl) {
      throw new BadRequestException('contractUrl é obrigatório.');
    }
    const tenantId = await this.getTenantId();
    const sale = await this.prisma.sale.findFirst({ where: { id: saleId, tenantId } });
    if (!sale) {
      throw new NotFoundException(`Venda "${saleId}" não encontrada no Comissiona.`);
    }
    await this.prisma.sale.update({ where: { id: sale.id }, data: { contractFileUrl: contractUrl } });
    return { saleId: sale.id, updated: true };
  }
}
