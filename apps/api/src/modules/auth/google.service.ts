import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';

export interface PerfilDoGoogle {
  providerAccountId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  emailVerificado: boolean;
}

/**
 * Login com Google via OAuth 2.0, sem biblioteca externa.
 *
 * Pedimos apenas openid, email e profile. O acesso ao Google Agenda usa
 * escopos diferentes e sera solicitado a parte, na Etapa 14, para que o
 * usuario nao precise autorizar sua agenda so para entrar no sistema.
 */
@Injectable()
export class GoogleService {
  private readonly logger = new Logger(GoogleService.name);

  constructor(private readonly config: ConfigService) {}

  get habilitado(): boolean {
    return Boolean(
      this.config.get<string>('GOOGLE_CLIENT_ID') &&
        this.config.get<string>('GOOGLE_CLIENT_SECRET'),
    );
  }

  gerarEstado(): string {
    return randomBytes(16).toString('hex');
  }

  montarUrlDeAutorizacao(estado: string): string {
    if (!this.habilitado) {
      throw new ServiceUnavailableException(
        'O login com Google nao esta configurado neste ambiente.',
      );
    }

    const parametros = new URLSearchParams({
      client_id: this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      redirect_uri: this.config.getOrThrow<string>('GOOGLE_REDIRECT_URI'),
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'online',
      prompt: 'select_account',
      state: estado,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${parametros.toString()}`;
  }

  async buscarPerfil(codigo: string): Promise<PerfilDoGoogle> {
    const resposta = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: codigo,
        client_id: this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
        client_secret: this.config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
        redirect_uri: this.config.getOrThrow<string>('GOOGLE_REDIRECT_URI'),
        grant_type: 'authorization_code',
      }),
    });

    if (!resposta.ok) {
      this.logger.error(`Google recusou a troca do codigo: ${await resposta.text()}`);
      throw new ServiceUnavailableException('Nao foi possivel concluir o login com o Google.');
    }

    const { access_token: tokenDeAcesso } = (await resposta.json()) as { access_token: string };

    const perfil = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokenDeAcesso}` },
    });

    if (!perfil.ok) {
      throw new ServiceUnavailableException('Nao foi possivel ler seu perfil do Google.');
    }

    const dados = (await perfil.json()) as {
      sub: string;
      email: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    };

    return {
      providerAccountId: dados.sub,
      email: dados.email.toLowerCase(),
      name: dados.name?.trim() || dados.email.split('@')[0] || 'Usuario',
      avatarUrl: dados.picture ?? null,
      emailVerificado: dados.email_verified ?? false,
    };
  }
}
