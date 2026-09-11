import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  modeloDeRedefinicao,
  modeloDeSenhaAlterada,
  modeloDeVerificacao,
} from './mail.templates';

/**
 * Envio de e-mail transacional.
 *
 * Em desenvolvimento, sem RESEND_API_KEY configurada, o servico imprime o link
 * no terminal em vez de enviar. Isso permite testar todo o fluxo de verificacao
 * e recuperacao de senha sem criar conta em nenhum provedor.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  private get chave(): string | undefined {
    return this.config.get<string>('RESEND_API_KEY');
  }

  private get remetente(): string {
    return this.config.get<string>('MAIL_FROM') ?? 'Sinapse <onboarding@resend.dev>';
  }

  private get origemDaWeb(): string {
    return this.config.get<string>('WEB_ORIGIN') ?? 'http://localhost:3000';
  }

  async enviarVerificacaoDeEmail(para: string, nome: string, token: string): Promise<void> {
    const url = `${this.origemDaWeb}/verificar-email?token=${encodeURIComponent(token)}`;
    await this.enviar(para, modeloDeVerificacao(nome, url));
  }

  async enviarRedefinicaoDeSenha(para: string, nome: string, token: string): Promise<void> {
    const url = `${this.origemDaWeb}/redefinir-senha?token=${encodeURIComponent(token)}`;
    await this.enviar(para, modeloDeRedefinicao(nome, url));
  }

  async enviarAvisoDeSenhaAlterada(para: string, nome: string): Promise<void> {
    await this.enviar(para, modeloDeSenhaAlterada(nome, `${this.origemDaWeb}/login`));
  }

  private async enviar(
    para: string,
    modelo: { assunto: string; html: string; texto: string },
  ): Promise<void> {
    if (!this.chave) {
      const link = modelo.texto.match(/https?:\/\/\S+/)?.[0] ?? '(sem link)';
      this.logger.warn(
        [
          '',
          '--------------------------------------------------------------------',
          ' E-MAIL NAO ENVIADO (RESEND_API_KEY nao configurada)',
          ` Para:    ${para}`,
          ` Assunto: ${modelo.assunto}`,
          ` Link:    ${link}`,
          ' Copie o link acima e abra no navegador para continuar o fluxo.',
          '--------------------------------------------------------------------',
          '',
        ].join('\n'),
      );
      return;
    }

    try {
      const resposta = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.chave}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.remetente,
          to: [para],
          subject: modelo.assunto,
          html: modelo.html,
          text: modelo.texto,
        }),
      });

      if (!resposta.ok) {
        const detalhe = await resposta.text();
        this.logger.error(`Falha ao enviar e-mail para ${para}: ${resposta.status} ${detalhe}`);
        return;
      }

      this.logger.log(`E-mail enviado para ${para}: ${modelo.assunto}`);
    } catch (erro) {
      // Falha de e-mail nunca derruba o fluxo de cadastro.
      this.logger.error(
        `Erro de rede ao enviar e-mail para ${para}`,
        erro instanceof Error ? erro.stack : String(erro),
      );
    }
  }
}
