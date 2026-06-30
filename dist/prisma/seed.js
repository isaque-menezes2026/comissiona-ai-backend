"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Iniciando seed Comissiona AI...');
    let tenant = await prisma.tenant.findUnique({ where: { slug: 'support-solutions' } });
    if (!tenant) {
        tenant = await prisma.tenant.create({
            data: { name: 'Support Solutions', slug: 'support-solutions', email: 'contato@supportsolutions.com.br', taxRate: 0.10, plan: 'enterprise' },
        });
    }
    console.log('✅ Tenant:', tenant.name);
    const adminEmail = 'admin@supportsolutions.com.br';
    let admin = await prisma.user.findFirst({ where: { tenantId: tenant.id, email: adminEmail } });
    if (!admin) {
        admin = await prisma.user.create({
            data: { tenantId: tenant.id, name: 'Administrador', email: adminEmail, passwordHash: await bcrypt.hash('admin123', 10), role: 'ADMIN' },
        });
    }
    console.log('✅ Admin:', admin.email);
    const productDefs = [
        { name: 'Klingo', description: 'ERP para clinicas, hospitais dia e laboratorios', color: '#7c3aed', hasImplantation: true, hasMonthly: true },
        { name: 'Kualiz Base', description: 'Sistema omnichannel de atendimento ao cliente', color: '#2563eb', hasImplantation: false, hasMonthly: true },
        { name: 'Kure', description: 'Sistema para medicos autonomos e consultorios', color: '#059669', hasImplantation: false, hasMonthly: true },
        { name: 'Ipsign', description: 'Assinatura de documentos digitais', color: '#d97706', hasImplantation: false, hasMonthly: true },
        { name: 'BI', description: 'Business Intelligence e dashboards', color: '#dc2626', hasImplantation: true, hasMonthly: false },
        { name: 'Qockpit', description: 'Sistema de gestao da qualidade', color: '#0891b2', hasImplantation: true, hasMonthly: false },
    ];
    const products = {};
    for (const def of productDefs) {
        let p = await prisma.product.findFirst({ where: { tenantId: tenant.id, name: def.name } });
        if (!p) {
            p = await prisma.product.create({
                data: { ...def, tenantId: tenant.id, type: 'MAIN', generatesCommission: true, active: true },
            });
        }
        products[def.name] = p;
        console.log('✅ Produto:', def.name);
    }
    const moduleDefs = [
        { name: 'Kualiz CRM', description: 'Modulo CRM integrado', color: '#3b82f6' },
        { name: 'Kualiz PABX', description: 'Modulo PABX VoIP', color: '#8b5cf6' },
        { name: 'Kualiz IA', description: 'Atendimento automatizado com IA', color: '#06b6d4' },
        { name: 'Kualiz API', description: 'Integracao via API REST', color: '#10b981' },
    ];
    for (const def of moduleDefs) {
        let m = await prisma.product.findFirst({ where: { tenantId: tenant.id, name: def.name } });
        if (!m) {
            m = await prisma.product.create({
                data: { ...def, tenantId: tenant.id, type: 'MODULE', parentId: products['Kualiz Base'].id, hasMonthly: true, generatesCommission: true, active: true },
            });
        }
        products[def.name] = m;
        console.log('✅ Modulo:', def.name);
    }
    const existingRules = await prisma.commissionRule.count({ where: { tenantId: tenant.id } });
    if (existingRules === 0) {
        const ruleDefs = [
            { name: 'Klingo - Implantacao (8%) — Venda Direta', productId: products['Klingo'].id, saleOrigin: 'direct', beneficiaryType: 'SELLER', commissionType: 'PERCENTAGE_IMPLANTATION', percentage: 8, triggerEvent: 'INVOICE_PAID', appliesAfterDays: 30 },
            { name: 'Klingo - 1a Mensalidade (100%) — Parceiro', productId: products['Klingo'].id, saleOrigin: 'partner', beneficiaryType: 'PARTNER', commissionType: 'FIRST_MONTHLY_PAYMENT', percentage: 100, triggerEvent: 'FIRST_INVOICE_PAID', appliesAfterDays: 30 },
            { name: 'Klingo - Valor Fixo R$50 — Vendedor em venda de Parceiro', productId: products['Klingo'].id, saleOrigin: 'partner', beneficiaryType: 'SELLER', commissionType: 'FIXED_AMOUNT', fixedAmount: 50, triggerEvent: 'FIRST_INVOICE_PAID', appliesAfterDays: 30 },
            { name: 'Kualiz Base - 3a Mensalidade (100%)', productId: products['Kualiz Base'].id, beneficiaryType: 'SELLER', commissionType: 'THIRD_MONTHLY_PAYMENT', percentage: 100, triggerEvent: 'THIRD_INVOICE_PAID', appliesAfterDays: 90 },
            { name: 'Kualiz CRM - 3a Mensalidade (100%)', productId: products['Kualiz CRM'].id, beneficiaryType: 'SELLER', commissionType: 'THIRD_MONTHLY_PAYMENT', percentage: 100, triggerEvent: 'THIRD_INVOICE_PAID', appliesAfterDays: 90 },
            { name: 'Kualiz PABX - 3a Mensalidade (100%)', productId: products['Kualiz PABX'].id, beneficiaryType: 'SELLER', commissionType: 'THIRD_MONTHLY_PAYMENT', percentage: 100, triggerEvent: 'THIRD_INVOICE_PAID', appliesAfterDays: 90 },
            { name: 'Kualiz IA - 3a Mensalidade (100%)', productId: products['Kualiz IA'].id, beneficiaryType: 'SELLER', commissionType: 'THIRD_MONTHLY_PAYMENT', percentage: 100, triggerEvent: 'THIRD_INVOICE_PAID', appliesAfterDays: 90 },
            { name: 'Kualiz API - 3a Mensalidade (100%)', productId: products['Kualiz API'].id, beneficiaryType: 'SELLER', commissionType: 'THIRD_MONTHLY_PAYMENT', percentage: 100, triggerEvent: 'THIRD_INVOICE_PAID', appliesAfterDays: 90 },
            { name: 'Kure - 3a Mensalidade (100%)', productId: products['Kure'].id, beneficiaryType: 'SELLER', commissionType: 'THIRD_MONTHLY_PAYMENT', percentage: 100, triggerEvent: 'THIRD_INVOICE_PAID', appliesAfterDays: 90 },
            { name: 'Ipsign - Valor Fixo R$50 por venda', productId: products['Ipsign'].id, beneficiaryType: 'SELLER', commissionType: 'FIXED_AMOUNT', fixedAmount: 50, triggerEvent: 'INVOICE_PAID', appliesAfterDays: 15 },
            { name: 'BI - Implantacao (8%)', productId: products['BI'].id, beneficiaryType: 'SELLER', commissionType: 'PERCENTAGE_IMPLANTATION', percentage: 8, triggerEvent: 'INVOICE_PAID', appliesAfterDays: 30 },
            { name: 'Qockpit - Implantacao (8%)', productId: products['Qockpit'].id, beneficiaryType: 'SELLER', commissionType: 'PERCENTAGE_IMPLANTATION', percentage: 8, triggerEvent: 'INVOICE_PAID', appliesAfterDays: 30 },
            { name: 'Colaborador Indicador - R$50 por conversao', productId: null, saleOrigin: 'employee', beneficiaryType: 'EMPLOYEE', commissionType: 'FIXED_AMOUNT', fixedAmount: 50, triggerEvent: 'INVOICE_PAID', appliesAfterDays: 30 },
        ];
        for (const rule of ruleDefs) {
            await prisma.commissionRule.create({
                data: { ...rule, tenantId: tenant.id, appliesOnNetAmount: true, requiresCustomerActive: true, requiresInvoicePaid: true, active: true },
            });
            console.log('✅ Regra:', rule.name);
        }
    }
    else {
        console.log(`⏭️  Regras ja existem (${existingRules}), pulando...`);
    }
    const sellerEmail = 'vendedor@supportsolutions.com.br';
    let seller = await prisma.seller.findFirst({ where: { tenantId: tenant.id, email: sellerEmail } });
    if (!seller) {
        seller = await prisma.seller.create({
            data: { tenantId: tenant.id, name: 'Vendedor Demo', email: sellerEmail, role: 'Executivo de Vendas', team: 'Comercial', active: true },
        });
    }
    let sellerUser = await prisma.user.findFirst({ where: { tenantId: tenant.id, email: sellerEmail } });
    if (!sellerUser) {
        sellerUser = await prisma.user.create({
            data: { tenantId: tenant.id, name: 'Vendedor Demo', email: sellerEmail, passwordHash: await bcrypt.hash('vendedor123', 10), role: 'SELLER', sellerId: seller.id },
        });
    }
    console.log('✅ Vendedor demo:', seller.name);
    console.log('');
    console.log('🎉 Seed concluido!');
    console.log('');
    console.log('CREDENCIAIS:');
    console.log('  Admin:    admin@supportsolutions.com.br    / admin123');
    console.log('  Vendedor: vendedor@supportsolutions.com.br / vendedor123');
}
main()
    .catch((e) => { console.error('❌ Seed falhou:', e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
//# sourceMappingURL=seed.js.map