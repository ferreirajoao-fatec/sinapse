import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { TokenType } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import {
  COOKIE_ACESSO,
  COOKIE_ATUALIZACAO,
  VALIDADE_TOKEN_SENHA_MINUTOS,
  VALIDADE_TOKEN_VERIFICACAO_HORAS,
} from '@sinapse/shared';
import type { CookieOptions, Response } from 'express';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface ParDeTokens {
  tokenDeAcesso: string;
  tokenDeAtualizacao: string;
  expiraEm: Date;
}

/**
 * Responsavel por criar, guardar e revogar tokens.
 *
 * Duas regras de seguranca norteiam este arquivo:
 * 1. Nenhum token e guardado em texto puro no banco. Guardamos o SHA-256.
 * 2. O token de atualizacao gira a cada uso: usar um token antigo nao funciona.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get producao(): boolean {
    return this.config.get<string>('NODE_ENV') === 'production';
  }

  /** SHA-256 e suficiente aqui: o valor de entrada ja tem 512 bits de entropia. */
  private hash(valor: string): string {
    return createHash('sha256').update(valor).digest('hex');
  }

  async criarSessao(
    usuario: { id: string; email: string },
    contexto: { userAgent?: string; ipAddress?: string },
  ): Promise<ParDeTokens> {
    const tokenDeAcesso = await this.jwt.signAsync(
      { sub: usuario.id, email: usuario.email },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: (this.config.get<string>('JWT_ACCESS_TTL') ?? '15m') as NonNullable<
          JwtSignOptions['expiresIn']
        >,
      },
    );

    const tokenDeAtualizacao = randomBytes(64).toString('hex');
    const expiraEm = new Date(Date.now() + this.diasDeAtualizacao() * 24 * 60 * 60 * 1000);

    await this.prisma.session.create({
      data: {
        userId: usuario.id,
        refreshTokenHash: this.hash(tokenDeAtualizacao),
        userAgent: contexto.userAgent?.slice(0, 400),
        ipAddress: contexto.ipAddress?.slice(0, 64),
        expiresAt: expiraEm,
      },
    });

    return { tokenDeAcesso, tokenDeAtualizacao, expiraEm };
  }

  /**
   * Troca um token de atualizacao valido por um par novo, revogando o antigo.
   * Devolve null se o token nao existe, ja foi usado ou expirou.
   */
  async girarSessao(
    tokenDeAtualizacao: string,
    contexto: { userAgent?: string; ipAddress?: string },
  ): Promise<(ParDeTokens & { usuario: { id: string; email: string } }) | null> {
    const sessao = await this.prisma.session.findFirst({
      where: {
        refreshTokenHash: this.hash(tokenDeAtualizacao),
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: { select: { id: true, email: true, deletedAt: true } } },
    });

    if (!sessao || sessao.user.deletedAt) {
      return null;
    }

    await this.prisma.session.update({
      where: { id: sessao.id },
      data: { revokedAt: new Date() },
    });

    const usuario = { id: sessao.user.id, email: sessao.user.email };
    const novos = await this.criarSessao(usuario, contexto);

    return { ...novos, usuario };
  }

  async revogarSessao(tokenDeAtualizacao: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { refreshTokenHash: this.hash(tokenDeAtualizacao), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Usado ao trocar a senha: derruba todos os dispositivos conectados. */
  async revogarTodasAsSessoes(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Cria um token de uso unico para e-mail. Devolve o valor em texto puro,
   * que so existe neste retorno e no link enviado ao usuario.
   */
  async criarTokenDeEmail(userId: string, tipo: TokenType): Promise<string> {
    // Invalida pedidos anteriores do mesmo tipo, para que so o ultimo link funcione.
    await this.prisma.verificationToken.updateMany({
      where: { userId, type: tipo, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = randomBytes(32).toString('hex');
    const minutos =
      tipo === TokenType.password_reset
        ? VALIDADE_TOKEN_SENHA_MINUTOS
        : VALIDADE_TOKEN_VERIFICACAO_HORAS * 60;

    await this.prisma.verificationToken.create({
      data: {
        userId,
        tokenHash: this.hash(token),
        type: tipo,
        expiresAt: new Date(Date.now() + minutos * 60 * 1000),
      },
    });

    return token;
  }

  /** Consome um token de e-mail. Devolve o userId, ou null se invalido. */
  async consumirTokenDeEmail(token: string, tipo: TokenType): Promise<string | null> {
    const registro = await this.prisma.verificationToken.findFirst({
      where: {
        tokenHash: this.hash(token),
        type: tipo,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!registro) {
      return null;
    }

    await this.prisma.verificationToken.update({
      where: { id: registro.id },
      data: { usedAt: new Date() },
    });

    return registro.userId;
  }

  // ---------------------------------------------------------------------------
  // Cookies
  // ---------------------------------------------------------------------------

  private opcoesBase(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.producao,
      sameSite: 'lax',
    };
  }

  gravarCookies(resposta: Response, tokens: ParDeTokens): void {
    resposta.cookie(COOKIE_ACESSO, tokens.tokenDeAcesso, {
      ...this.opcoesBase(),
      path: '/',
      maxAge: this.minutosDeAcesso() * 60 * 1000,
    });

    resposta.cookie(COOKIE_ATUALIZACAO, tokens.tokenDeAtualizacao, {
      ...this.opcoesBase(),
      // O token de atualizacao so e enviado para as rotas de autenticacao,
      // reduzindo a superficie de exposicao.
      path: '/api/v1/auth',
      maxAge: this.diasDeAtualizacao() * 24 * 60 * 60 * 1000,
    });
  }

  limparCookies(resposta: Response): void {
    resposta.clearCookie(COOKIE_ACESSO, { ...this.opcoesBase(), path: '/' });
    resposta.clearCookie(COOKIE_ATUALIZACAO, { ...this.opcoesBase(), path: '/api/v1/auth' });
  }

  private minutosDeAcesso(): number {
    const valor = this.config.get<string>('JWT_ACCESS_TTL') ?? '15m';
    const numero = Number.parseInt(valor, 10);
    if (Number.isNaN(numero)) return 15;
    if (valor.endsWith('h')) return numero * 60;
    if (valor.endsWith('d')) return numero * 60 * 24;
    return numero;
  }

  private diasDeAtualizacao(): number {
    const valor = this.config.get<string>('JWT_REFRESH_TTL') ?? '7d';
    const numero = Number.parseInt(valor, 10);
    if (Number.isNaN(numero)) return 7;
    if (valor.endsWith('h')) return Math.max(1, Math.round(numero / 24));
    return numero;
  }
}
