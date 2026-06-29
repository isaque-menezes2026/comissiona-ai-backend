// src/commission-engine/commission-engine.service.ts
//
// MOTOR DE COMISSÃO — Comissiona AI
// Responsável por calcular, criar e atualizar comissões automaticamente.
// Totalmente configurável via commission_rules — nenhuma regra hardcoded.

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CommissionStatus, CommissionType, TriggerEvent, BeneficiaryType } from '@prisma/client';
import * as dayjs from 'dayjs';

interface CalculationContext {
  tenantId: string;
  saleId: string;
  triggeredBy?: string; // userId que disparou
}

@Injectable()
export class CommissionEngineService {
  private readonly logger = new Logger(CommissionEngineService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // PONTO DE ENTRADA PRINCIPAL
  // Chamado após criação/atualização de venda
  // ──────────────────────────────────────────────────────────────────────────

  async processSale(ctx: CalculationContext): Promise<void> {
    const { tenantId, saleId } = ctx;
    this.logger.log(`[ENGINE] Processando venda ${saleId} para tenant ${tenantId}`);

    const sale = await this.prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        items: { include: { product: true } },
        seller: true,
        partner: true,
        employee: true,
        customer: true,
      },
    });

    if (!sale || sale.tenantId !== tenantId) {
      this.logger.warn(`[ENGINE] Venda ${saleId} não encontrada ou tenant inválido.`);
      return;
    }

    // Para cada item da venda, busca e aplica regras
    for (const item of sale.items) {
      await this.processItem(sale, item, ctx);
    }

    await this.audit.log({
      tenantId,
      action: 'COMMISSION_CALCULATED',
      entity: 'sale',
      entityId: saleId,
      metadata: { itemCount: sale.items.length },
      userId: ctx.triggeredBy,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PROCESSAMENTO POR ITEM
  // ──────────────────────────────────────────────────────────────────────────

  private async processItem(sale: any, item: any, ctx: CalculationContext) {
    // Busca regras aplicáveis a este item
    const rules = await this.findApplicableRules(sale, item);

    for (const rule of rules) {
      // Evita duplicatas: verifica se comissão já existe para esta venda+item+regra
      const exists = await this.prisma.commission.findFirst({
        where: {
          tenantId: ctx.tenantId,
          saleId: sale.id,
          saleItemId: item.id,
          ruleId: rule.id,
        },
      });
      if (exists) continue;

      const commission = await this.calculateCommission(sale, item, rule);
      if (!commission) continue;

      await this.createCommission(ctx.tenantId, sale, item, rule, commission, ctx.triggeredBy);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // BUSCA DE REGRAS APLICÁVEIS
  // ──────────────────────────────────────────────────────────────────────────

  private async findApplicableRules(sale: any, item: any) {
    const rules = await this.prisma.commissionRule.findMany({
      where: {
        tenantId: sale.tenantId,
        active: true,
        OR: [
          { productId: item.productId },
          { productId: null }, // regras globais
        ],
        AND: [
          {
            OR: [
              { saleOrigin: sale.origin },
              { saleOrigin: 'any' },
              { saleOrigin: null },
            ],
          },
        ],
      },
    });

    return rules.filter((rule) => {
      // Valida beneficiário
      if (rule.beneficiaryType === BeneficiaryType.PARTNER && !sale.partnerId) return false;
      if (rule.beneficiaryType === BeneficiaryType.EMPLOYEE && !sale.employeeId) return false;

      // Valida vigência
      const now = new Date();
      if (rule.startDate && rule.startDate > now) return false;
      if (rule.endDate && rule.endDate < now) return false;

      return true;
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CÁLCULO DO VALOR DA COMISSÃO
  // SEMPRE sobre valor LÍQUIDO (net) — conforme ADENDO obrigatório
  // ──────────────────────────────────────────────────────────────────────────

  private calculateCommission(
    sale: any,
    item: any,
    rule: any,
  ): { amount: number; baseValue: number | null; isFixed: boolean } | null {
    const netValue = Number(item.netValue); // BASE: sempre líquido

    switch (rule.commissionType as CommissionType) {
      case CommissionType.FIXED_AMOUNT:
        // Valor fixo NÃO desconta impostos (conforme ADENDO)
        return {
          amount: Number(rule.fixedAmount),
          baseValue: null,
          isFixed: true,
        };

      case CommissionType.PERCENTAGE_IMPLANTATION:
        if (item.type !== 'IMPLANTATION') return null;
        return {
          amount: (netValue * Number(rule.percentage)) / 100,
          baseValue: netValue,
          isFixed: false,
        };

      case CommissionType.PERCENTAGE_MONTHLY:
        if (item.type !== 'MONTHLY') return null;
        return {
          amount: (netValue * Number(rule.percentage)) / 100,
          baseValue: netValue,
          isFixed: false,
        };

      case CommissionType.FIRST_MONTHLY_PAYMENT:
        if (item.type !== 'MONTHLY') return null;
        // 100% da 1ª mensalidade líquida
        return {
          amount: (netValue * Number(rule.percentage ?? 100)) / 100,
          baseValue: netValue,
          isFixed: false,
        };

      case CommissionType.THIRD_MONTHLY_PAYMENT:
        if (item.type !== 'MONTHLY') return null;
        // 100% da 3ª mensalidade líquida
        return {
          amount: (netValue * Number(rule.percentage ?? 100)) / 100,
          baseValue: netValue,
          isFixed: false,
        };

      case CommissionType.RECURRING:
        if (item.type !== 'MONTHLY') return null;
        return {
          amount: (netValue * Number(rule.percentage)) / 100,
          baseValue: netValue,
          isFixed: false,
        };

      default:
        return null;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CRIAÇÃO DO REGISTRO DE COMISSÃO + PREVISÃO DE RECEBIMENTO
  // ──────────────────────────────────────────────────────────────────────────

  private async createCommission(
    tenantId: string,
    sale: any,
    item: any,
    rule: any,
    calc: { amount: number; baseValue: number | null; isFixed: boolean },
    userId?: string,
  ) {
    // Determina beneficiário
    const { beneficiaryId, sellerId, partnerId, employeeId } =
      this.resolveBeneficiary(sale, rule.beneficiaryType);

    // Calcula previsão de recebimento (ADENDO obrigatório)
    const forecast = this.calculateForecast(sale, rule);

    // Status inicial baseado no gatilho
    const initialStatus = this.resolveInitialStatus(rule, sale);

    await this.prisma.commission.create({
      data: {
        tenantId,
        saleId: sale.id,
        saleItemId: item.id,
        ruleId: rule.id,
        beneficiaryType: rule.beneficiaryType,
        beneficiaryId,
        sellerId,
        partnerId,
        employeeId,
        status: initialStatus,
        commissionType: rule.commissionType,
        baseValue: calc.baseValue,
        percentage: rule.percentage,
        amount: calc.amount,
        isFixed: calc.isFixed,
        forecastReason: forecast.reason,

        // ADENDO: campos obrigatórios de previsão
        dateSaleBase: sale.billingStartDate || sale.contractDate || sale.saleDate,
        dateExpectedBilling: forecast.expectedBilling,
        dateExpectedCustomerPayment: forecast.expectedCustomerPayment,
        dateExpectedRelease: forecast.expectedRelease,
        avgReceiptDays: forecast.avgDays,
        expectedPaymentCompetence: forecast.competence,
        forecastStatus: forecast.forecastStatus,
      },
    });

    this.logger.log(
      `[ENGINE] Comissão criada: ${calc.amount} para ${beneficiaryId} | ${rule.commissionType} | ${initialStatus}`,
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RESOLUÇÃO DE BENEFICIÁRIO
  // ──────────────────────────────────────────────────────────────────────────

  private resolveBeneficiary(sale: any, beneficiaryType: BeneficiaryType) {
    switch (beneficiaryType) {
      case BeneficiaryType.SELLER:
        return {
          beneficiaryId: sale.sellerId,
          sellerId: sale.sellerId,
          partnerId: null,
          employeeId: null,
        };
      case BeneficiaryType.PARTNER:
        return {
          beneficiaryId: sale.partnerId,
          sellerId: null,
          partnerId: sale.partnerId,
          employeeId: null,
        };
      case BeneficiaryType.EMPLOYEE:
        return {
          beneficiaryId: sale.employeeId,
          sellerId: null,
          partnerId: null,
          employeeId: sale.employeeId,
        };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PREVISÃO DE RECEBIMENTO (ADENDO OBRIGATÓRIO)
  // O sistema DEVE informar: quanto, por qual venda, qual regra, quando, qual condição falta
  // ──────────────────────────────────────────────────────────────────────────

  private calculateForecast(sale: any, rule: any) {
    const base = dayjs(sale.billingStartDate || sale.contractDate || sale.saleDate);
    let avgDays = rule.appliesAfterDays || 30;
    let reason = 'Faturamento';
    let forecastStatus = 'awaiting_billing';

    switch (rule.commissionType as CommissionType) {
      case CommissionType.THIRD_MONTHLY_PAYMENT:
        avgDays = rule.appliesAfterDays || 90; // padrão 90 dias para 3ª mensalidade
        reason = '3ª mensalidade paga';
        forecastStatus = 'awaiting_third_payment';
        break;
      case CommissionType.FIRST_MONTHLY_PAYMENT:
        avgDays = rule.appliesAfterDays || 30;
        reason = '1ª mensalidade paga';
        forecastStatus = 'awaiting_first_payment';
        break;
      case CommissionType.PERCENTAGE_IMPLANTATION:
        avgDays = rule.appliesAfterDays || 30;
        reason = 'Implantação faturada e paga';
        forecastStatus = 'awaiting_implantation_payment';
        break;
      case CommissionType.FIXED_AMOUNT:
        avgDays = rule.appliesAfterDays || 15;
        reason = 'Contrato convertido / faturado';
        forecastStatus = 'awaiting_contract';
        break;
    }

    const expectedBilling = base.add(7, 'day').toDate();
    const expectedCustomerPayment = base.add(avgDays, 'day').toDate();
    const expectedRelease = base.add(avgDays + 5, 'day').toDate(); // +5 dias para processamento
    const competence = dayjs(expectedRelease).format('YYYY-MM');

    return {
      avgDays,
      reason,
      forecastStatus,
      expectedBilling,
      expectedCustomerPayment,
      expectedRelease,
      competence,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STATUS INICIAL DA COMISSÃO
  // ──────────────────────────────────────────────────────────────────────────

  private resolveInitialStatus(rule: any, sale: any): CommissionStatus {
    // Se requer aprovação manual, bloqueia
    if (rule.requiresManagerApproval) return CommissionStatus.BLOCKED;

    // Comissões de mensalidade ficam previstas até evento ocorrer
    if (
      rule.commissionType === CommissionType.THIRD_MONTHLY_PAYMENT ||
      rule.commissionType === CommissionType.FIRST_MONTHLY_PAYMENT
    ) {
      return CommissionStatus.PREDICTED;
    }

    // Contrato assinado como gatilho e contrato já assinado
    if (
      rule.triggerEvent === TriggerEvent.CONTRACT_SIGNED &&
      sale.contractDate
    ) {
      return CommissionStatus.RELEASED;
    }

    return CommissionStatus.PREDICTED;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // LIBERAÇÃO POR EVENTO (invoice pago, 3ª mensalidade paga etc.)
  // ──────────────────────────────────────────────────────────────────────────

  async processInvoicePaid(tenantId: string, saleId: string, installmentNum: number, userId?: string) {
    this.logger.log(`[ENGINE] Fatura ${installmentNum} paga para venda ${saleId}`);

    // Busca comissões previstas desta venda
    const commissions = await this.prisma.commission.findMany({
      where: { tenantId, saleId, status: { in: [CommissionStatus.PREDICTED, CommissionStatus.BLOCKED] } },
      include: { rule: true },
    });

    for (const commission of commissions) {
      const shouldRelease = this.evaluateTrigger(commission, installmentNum);
      if (!shouldRelease) continue;

      await this.prisma.commission.update({
        where: { id: commission.id },
        data: {
          status: CommissionStatus.RELEASED,
          releasedAt: new Date(),
          forecastStatus: 'released',
        },
      });

      await this.audit.log({
        tenantId,
        action: 'COMMISSION_RELEASED',
        entity: 'commission',
        entityId: commission.id,
        metadata: { installmentNum, trigger: commission.rule.triggerEvent },
        userId,
      });

      this.logger.log(`[ENGINE] Comissão ${commission.id} liberada (parcela ${installmentNum})`);
    }
  }

  private evaluateTrigger(commission: any, installmentNum: number): boolean {
    const trigger = commission.rule.triggerEvent as TriggerEvent;
    switch (trigger) {
      case TriggerEvent.INVOICE_PAID:
        return true;
      case TriggerEvent.FIRST_INVOICE_PAID:
        return installmentNum === 1;
      case TriggerEvent.THIRD_INVOICE_PAID:
        return installmentNum === 3;
      default:
        return false;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CANCELAMENTO (cliente cancelou, inadimplência etc.)
  // ──────────────────────────────────────────────────────────────────────────

  async cancelSaleCommissions(tenantId: string, saleId: string, reason: string, userId?: string) {
    const result = await this.prisma.commission.updateMany({
      where: {
        tenantId,
        saleId,
        status: { in: [CommissionStatus.PREDICTED, CommissionStatus.BLOCKED] },
      },
      data: {
        status: CommissionStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: reason,
        forecastStatus: 'cancelled',
      },
    });

    await this.audit.log({
      tenantId,
      action: 'COMMISSIONS_CANCELLED',
      entity: 'sale',
      entityId: saleId,
      metadata: { count: result.count, reason },
      userId,
    });

    return result;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RECÁLCULO AUTORIZADO (quando valor da venda é alterado)
  // ──────────────────────────────────────────────────────────────────────────

  async recalculate(ctx: CalculationContext & { authorizedById: string }) {
    this.logger.log(`[ENGINE] Recalculando comissões da venda ${ctx.saleId} autorizado por ${ctx.authorizedById}`);

    // Cancela comissões previstas anteriores
    await this.cancelSaleCommissions(ctx.tenantId, ctx.saleId, 'Recalculado por alteração de venda', ctx.authorizedById);

    // Reprocessa
    await this.processSale(ctx);

    await this.audit.log({
      tenantId: ctx.tenantId,
      action: 'COMMISSION_RECALCULATED',
      entity: 'sale',
      entityId: ctx.saleId,
      userId: ctx.authorizedById,
    });
  }
}
