import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  COOKIE_ATUALIZACAO,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type RegisterInput,
  type ResendVerificationInput,
  type ResetPasswordInput,
  type VerifyEmailInput,
} from '@sinapse/shared';
import type { Response } from 'express';
import { Publico } from '../../common/decorators/publico.decorator';
import { UsuarioAtual } from '../../common/decorators/usuario-atual.decorator';
import { ValidacaoZod } from '../../common/pipes/zod-validation.pipe';
import type { RequisicaoAutenticada } from '../../common/types/requisicao-autenticada';
import { AuthService } from './auth.service';
import { GoogleService } from './google.service';
import { TokenService } from './token.service';

/** Mensagem identica para e-mail existente ou nao, evitando enumeracao de contas. */
const RESPOSTA_NEUTRA = {
  mensagem: 'Se houver uma conta com este e-mail, enviamos as instrucoes agora.',
};

@ApiTags('Autenticacao')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
    private readonly google: GoogleService,
  ) {}

  private contexto(requisicao: RequisicaoAutenticada) {
    return {
      userAgent: requisicao.headers['user-agent'],
      ipAddress: requisicao.ip,
    };
  }

  // ---------------------------------------------------------------------------

  @Publico()
  @Post('cadastrar')
  @Throttle({ padrao: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cria a conta e ja abre a sessao' })
  async cadastrar(
    @Body(new ValidacaoZod(registerSchema)) dados: RegisterInput,
    @Req() requisicao: RequisicaoAutenticada,
    @Res({ passthrough: true }) resposta: Response,
  ) {
    const tokens = await this.auth.cadastrar(dados, this.contexto(requisicao));
    this.tokens.gravarCookies(resposta, tokens);

    return { mensagem: 'Conta criada. Enviamos um e-mail para confirmar seu endereco.' };
  }

  @Publico()
  @Post('entrar')
  @Throttle({ padrao: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autentica por e-mail e senha' })
  async entrar(
    @Body(new ValidacaoZod(loginSchema)) dados: LoginInput,
    @Req() requisicao: RequisicaoAutenticada,
    @Res({ passthrough: true }) resposta: Response,
  ) {
    const tokens = await this.auth.entrar(dados, this.contexto(requisicao));
    this.tokens.gravarCookies(resposta, tokens);

    return { mensagem: 'Sessao iniciada.' };
  }

  @Publico()
  @Post('atualizar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renova a sessao usando o token de atualizacao' })
  async atualizar(
    @Req() requisicao: RequisicaoAutenticada,
    @Res({ passthrough: true }) resposta: Response,
  ) {
    const atual = (requisicao.cookies as Record<string, string> | undefined)?.[COOKIE_ATUALIZACAO];

    try {
      const tokens = await this.auth.atualizarSessao(atual, this.contexto(requisicao));
      this.tokens.gravarCookies(resposta, tokens);
      return { mensagem: 'Sessao renovada.' };
    } catch (erro) {
      this.tokens.limparCookies(resposta);
      throw erro;
    }
  }

  @Publico()
  @Post('sair')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Encerra a sessao atual' })
  async sair(
    @Req() requisicao: RequisicaoAutenticada,
    @Res({ passthrough: true }) resposta: Response,
  ): Promise<void> {
    const atual = (requisicao.cookies as Record<string, string> | undefined)?.[COOKIE_ATUALIZACAO];

    await this.auth.sair(atual, requisicao.usuario?.id, this.contexto(requisicao));
    this.tokens.limparCookies(resposta);
  }

  @Get('sessao')
  @ApiOperation({ summary: 'Dados do usuario autenticado' })
  sessao(@UsuarioAtual('id') userId: string) {
    return this.auth.buscarSessao(userId);
  }

  // ---------------------------------------------------------------------------
  // E-mail
  // ---------------------------------------------------------------------------

  @Publico()
  @Post('verificar-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirma o e-mail a partir do token do link' })
  async verificarEmail(@Body(new ValidacaoZod(verifyEmailSchema)) dados: VerifyEmailInput) {
    const { email } = await this.auth.verificarEmail(dados.token);
    return { mensagem: 'E-mail confirmado com sucesso.', email };
  }

  @Publico()
  @Post('reenviar-verificacao')
  @Throttle({ padrao: { limit: 3, ttl: 300_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reenvia o e-mail de confirmacao' })
  async reenviarVerificacao(
    @Body(new ValidacaoZod(resendVerificationSchema)) dados: ResendVerificationInput,
  ) {
    await this.auth.reenviarVerificacao(dados.email);
    return RESPOSTA_NEUTRA;
  }

  // ---------------------------------------------------------------------------
  // Senha
  // ---------------------------------------------------------------------------

  @Publico()
  @Post('esqueci-senha')
  @Throttle({ padrao: { limit: 3, ttl: 300_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Envia o link de redefinicao de senha' })
  async esqueciSenha(@Body(new ValidacaoZod(forgotPasswordSchema)) dados: ForgotPasswordInput) {
    await this.auth.solicitarRedefinicao(dados);
    return RESPOSTA_NEUTRA;
  }

  @Publico()
  @Post('redefinir-senha')
  @Throttle({ padrao: { limit: 5, ttl: 300_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Define a nova senha e abre a sessao' })
  async redefinirSenha(
    @Body(new ValidacaoZod(resetPasswordSchema)) dados: ResetPasswordInput,
    @Req() requisicao: RequisicaoAutenticada,
    @Res({ passthrough: true }) resposta: Response,
  ) {
    const tokens = await this.auth.redefinirSenha(dados, this.contexto(requisicao));
    this.tokens.gravarCookies(resposta, tokens);

    return { mensagem: 'Senha alterada. Todas as outras sessoes foram encerradas.' };
  }

  // ---------------------------------------------------------------------------
  // Google
  // ---------------------------------------------------------------------------

  @Publico()
  @Get('google/disponivel')
  @ApiOperation({ summary: 'Informa se o login com Google esta configurado' })
  googleDisponivel() {
    return { habilitado: this.google.habilitado };
  }

  @Publico()
  @Get('google')
  @ApiOperation({ summary: 'Redireciona para a tela de consentimento do Google' })
  iniciarGoogle(@Res() resposta: Response): void {
    const estado = this.google.gerarEstado();

    // O estado e devolvido pelo Google e comparado no retorno: protege contra CSRF.
    resposta.cookie('sinapse_oauth_estado', estado, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 10 * 60 * 1000,
      path: '/api/v1/auth',
    });

    resposta.redirect(this.google.montarUrlDeAutorizacao(estado));
  }

  @Publico()
  @Get('google/callback')
  @ApiOperation({ summary: 'Recebe o retorno do Google e abre a sessao' })
  async retornoDoGoogle(
    @Query('code') codigo: string | undefined,
    @Query('state') estado: string | undefined,
    @Query('error') erro: string | undefined,
    @Req() requisicao: RequisicaoAutenticada,
    @Res() resposta: Response,
  ): Promise<void> {
    const origemWeb = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
    const estadoEsperado = (requisicao.cookies as Record<string, string> | undefined)
      ?.sinapse_oauth_estado;

    resposta.clearCookie('sinapse_oauth_estado', { path: '/api/v1/auth' });

    const falhar = (motivo: string) =>
      resposta.redirect(`${origemWeb}/login?erro=${encodeURIComponent(motivo)}`);

    if (erro || !codigo) {
      return falhar('O login com o Google foi cancelado.');
    }

    if (!estado || !estadoEsperado || estado !== estadoEsperado) {
      return falhar('A tentativa de login expirou. Tente novamente.');
    }

    try {
      const perfil = await this.google.buscarPerfil(codigo);
      const tokens = await this.auth.entrarComGoogle(perfil, {
        userAgent: requisicao.headers['user-agent'],
        ipAddress: requisicao.ip,
      });

      this.tokens.gravarCookies(resposta, tokens);
      resposta.redirect(origemWeb);
    } catch (falha) {
      const mensagem =
        falha instanceof Error ? falha.message : 'Nao foi possivel entrar com o Google.';
      return falhar(mensagem);
    }
  }
}
