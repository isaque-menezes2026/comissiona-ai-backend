import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Resend } from 'resend';

// Envio de e-mail transacional (fluxo de "esqueci minha senha") via Resend.
// Sem RESEND_API_KEY configurada, o backend não falha — só loga o link de
// redefinição no console, o que permite testar o fluxo antes de ter um
// provedor de e-mail configurado em produção.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const RESET_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Comissiona AI <onboarding@resend.dev>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://comissiona-ai-frontend.vercel.app';
const RESET_TOKEN_TTL_MINUTES = 60;

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { email, active: true },
      include: { tenant: true },
    });
    if (!user) throw new UnauthorizedException('Credenciais inválidas');
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas');

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const payload = { sub: user.id, tenantId: user.tenantId, role: user.role, email: user.email };
    return {
      accessToken: this.jwt.sign(payload),
      user: { id: user.id, name: user.name, email: user.email, role: user.role, tenant: { id: user.tenant.id, name: user.tenant.name, slug: user.tenant.slug } },
    };
  }

  async me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, tenantId: true, sellerId: true, partnerId: true, tenant: { select: { id: true, name: true, slug: true, taxRate: true } } },
    });
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const valid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Senha atual incorreta');
    const hash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
    return { message: 'Senha alterada com sucesso' };
  }

  // Resposta sempre genérica — não revela se o e-mail existe ou não na base
  // (evita que alguém use esse endpoint pra descobrir quais e-mails estão
  // cadastrados no sistema).
  async forgotPassword(email: string) {
    const genericResponse = { message: 'Se o e-mail informado estiver cadastrado, enviaremos um link de redefinição de senha.' };
    if (!email) return genericResponse;

    const user = await this.prisma.user.findFirst({ where: { email, active: true } });
    if (!user) return genericResponse;

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, token: tokenHash, expiresAt },
    });

    const resetUrl = `${FRONTEND_URL}/auth/reset-password?token=${rawToken}`;

    if (resend) {
      try {
        await resend.emails.send({
          from: RESET_FROM_EMAIL,
          to: user.email,
          subject: 'Redefinição de senha — Comissiona AI',
          html: `<p>Olá, ${user.name}.</p><p>Recebemos um pedido para redefinir sua senha no Comissiona AI.</p><p><a href="${resetUrl}">Clique aqui para criar uma nova senha</a></p><p>Este link expira em ${RESET_TOKEN_TTL_MINUTES} minutos. Se você não pediu essa redefinição, pode ignorar este e-mail.</p>`,
        });
      } catch (err) {
        // Não deixa o erro de envio vazar pro cliente da API — só loga pra investigação interna.
        console.error('Falha ao enviar e-mail de redefinição de senha:', err);
      }
    } else {
      console.warn('RESEND_API_KEY não configurada — e-mail de redefinição não enviado. Link gerado:', resetUrl);
    }

    return genericResponse;
  }

  async resetPassword(token: string, newPassword: string) {
    if (!token) throw new BadRequestException('Link de redefinição inválido ou expirado.');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const record = await this.prisma.passwordResetToken.findUnique({ where: { token: tokenHash } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Link de redefinição inválido ou expirado.');
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash: hash } }),
      this.prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);

    return { message: 'Senha redefinida com sucesso.' };
  }
}
