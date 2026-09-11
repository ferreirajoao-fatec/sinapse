import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';
import { ActivityAction, ActivityEntity, TokenType } from '@prisma/client';
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from '@sinapse/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import type { PerfilDoGoogle } from './google.service';
import { TokenService, type ParDeTokens } from './token.service';

interface ContextoDaRequisicao {
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly mail: MailService,
    private readonly users: UsersService,
  ) {}

  // ---------------------------------------------------------------------------
  // Cadastro
  // ---------------------------------------------------------------------------

  async cadastrar(dados: RegisterInput, contexto: ContextoDaRequisicao): Promise<ParDeTokens> {
    const jaExiste = await this.prisma.user.findUnique({
      where: { email: dados.email },
      select: { id: true, deletedAt: true },
    });

    if (jaExiste) {
      throw new ConflictException('Ja existe uma conta com este e-mail.');
    }

    const usuario = await this.prisma.user.create({
      data: {
        name: dados.name,
        email: dados.email,
        passwordHash: await hash(dados.password),
        preferences: { create: {} },
      },
      select: { id: true, email: true, name: true },
    });

    await this.registrarAtividade(usuario.id, ActivityAction.created, contexto);
    await this.enviarVerificacao(usuario.id, usuario.email, usuario.name);

    return this.tokens.criarSessao(usuario, contexto);
  }

  // ---------------------------------------------------------------------------
  // Login
  // ---------------------------------------------------------------------------

  async entrar(dados: LoginInput, contexto: ContextoDaRequisicao): Promise<ParDeTokens> {
    const usuario = await this.prisma.user.findUnique({
      where: { email: dados.email },
      select: { id: true, email: true, passwordHash: true, deletedAt: true },
    });

    // Mensagem unica para e-mail inexistente e senha errada: nao revelamos
    // quais e-mails estao cadastrados.
    const generico = new UnauthorizedException('E-mail ou senha incorretos.');

    if (!usuario || usuario.deletedAt) {
      // Gasta tempo semelhante ao da verificacao real, dificultando descobrir
      // por medicao de tempo se o e-mail existe.
      await hash('senha_ficticia_para_igualar_o_tempo_de_resposta');
      throw generico;
    }

    if (!usuario.passwordHash) {
      throw new UnauthorizedException(
        'Esta conta foi criada com o Google. Entre com o Google ou use "Esqueci minha senha" para definir uma senha.',
      );
    }

    const senhaConfere = await verify(usuario.passwordHash, dados.password);

    if (!senhaConfere) {
      throw generico;
    }

    await this.registrarAtividade(usuario.id, ActivityAction.logged_in, contexto);

    return this.tokens.criarSessao({ id: usuario.id, email: usuario.email }, contexto);
  }

  // ---------------------------------------------------------------------------
  // Sessao
  // ---------------------------------------------------------------------------

  async atualizarSessao(
    tokenDeAtualizacao: string | undefined,
    contexto: ContextoDaRequisicao,
  ): Promise<ParDeTokens> {
    if (!tokenDeAtualizacao) {
      throw new UnauthorizedException('Sessao nao encontrada. Entre novamente.');
    }

    const resultado = await this.tokens.girarSessao(tokenDeAtualizacao, contexto);

    if (!resultado) {
      throw new UnauthorizedException('Sua sessao expirou. Entre novamente.');
    }

    return resultado;
  }

  async sair(
    tokenDeAtualizacao: string | undefined,
    userId: string | undefined,
    contexto: ContextoDaRequisicao,
  ): Promise<void> {
    if (tokenDeAtualizacao) {
      await this.tokens.revogarSessao(tokenDeAtualizacao);
    }

    if (userId) {
      await this.registrarAtividade(userId, ActivityAction.logged_out, contexto);
    }
  }

  // ---------------------------------------------------------------------------
  // Verificacao de e-mail
  // ---------------------------------------------------------------------------

  private async enviarVerificacao(userId: string, email: string, nome: string): Promise<void> {
    const token = await this.tokens.criarTokenDeEmail(userId, TokenType.email_verification);
    await this.mail.enviarVerificacaoDeEmail(email, nome, token);
  }

  async verificarEmail(token: string): Promise<{ email: string }> {
    const userId = await this.tokens.consumirTokenDeEmail(token, TokenType.email_verification);

    if (!userId) {
      throw new BadRequestException(
        'Este link de verificacao expirou ou ja foi usado. Peca um novo na tela de perfil.',
      );
    }

    const usuario = await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
      select: { email: true },
    });

    await this.registrarAtividade(userId, ActivityAction.email_verified, {});

    return usuario;
  }

  async reenviarVerificacao(email: string): Promise<void> {
    const usuario = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, emailVerifiedAt: true, deletedAt: true },
    });

    // Resposta sempre igual, exista o e-mail ou nao.
    if (!usuario || usuario.deletedAt || usuario.emailVerifiedAt) {
      return;
    }

    await this.enviarVerificacao(usuario.id, usuario.email, usuario.name);
  }

  // ---------------------------------------------------------------------------
  // Recuperacao de senha
  // ---------------------------------------------------------------------------

  async solicitarRedefinicao(dados: ForgotPasswordInput): Promise<void> {
    const usuario = await this.prisma.user.findUnique({
      where: { email: dados.email },
      select: { id: true, email: true, name: true, deletedAt: true },
    });

    // Nunca informamos se o e-mail existe. A tela mostra sempre a mesma mensagem.
    if (!usuario || usuario.deletedAt) {
      this.logger.log(`Pedido de redefinicao para e-mail nao cadastrado: ${dados.email}`);
      return;
    }

    const token = await this.tokens.criarTokenDeEmail(usuario.id, TokenType.password_reset);
    await this.mail.enviarRedefinicaoDeSenha(usuario.email, usuario.name, token);
    await this.registrarAtividade(usuario.id, ActivityAction.password_reset_requested, {});
  }

  async redefinirSenha(
    dados: ResetPasswordInput,
    contexto: ContextoDaRequisicao,
  ): Promise<ParDeTokens> {
    const userId = await this.tokens.consumirTokenDeEmail(dados.token, TokenType.password_reset);

    if (!userId) {
      throw new BadRequestException(
        'Este link expirou ou ja foi usado. Peca um novo em "Esqueci minha senha".',
      );
    }

    const usuario = await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await hash(dados.password),
        // Quem redefine a senha por e-mail prova ter acesso a caixa postal.
        emailVerifiedAt: new Date(),
      },
      select: { id: true, email: true, name: true },
    });

    // Trocar a senha derruba todos os dispositivos, inclusive o de quem invadiu.
    await this.tokens.revogarTodasAsSessoes(userId);
    await this.mail.enviarAvisoDeSenhaAlterada(usuario.email, usuario.name);
    await this.registrarAtividade(userId, ActivityAction.password_changed, contexto);

    return this.tokens.criarSessao({ id: usuario.id, email: usuario.email }, contexto);
  }

  // ---------------------------------------------------------------------------
  // Google
  // ---------------------------------------------------------------------------

  async entrarComGoogle(
    perfil: PerfilDoGoogle,
    contexto: ContextoDaRequisicao,
  ): Promise<ParDeTokens> {
    const contaExistente = await this.prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: 'google',
          providerAccountId: perfil.providerAccountId,
        },
      },
      include: { user: { select: { id: true, email: true, deletedAt: true } } },
    });

    if (contaExistente && !contaExistente.user.deletedAt) {
      await this.registrarAtividade(contaExistente.user.id, ActivityAction.logged_in, contexto);
      return this.tokens.criarSessao(
        { id: contaExistente.user.id, email: contaExistente.user.email },
        contexto,
      );
    }

    const porEmail = await this.prisma.user.findUnique({
      where: { email: perfil.email },
      select: { id: true, email: true, avatarUrl: true, deletedAt: true },
    });

    // Vincula ao usuario existente quando o Google confirma o mesmo e-mail.
    if (porEmail && !porEmail.deletedAt) {
      if (!perfil.emailVerificado) {
        throw new UnauthorizedException(
          'O Google nao confirmou este e-mail. Entre com sua senha para vincular as contas.',
        );
      }

      await this.prisma.account.create({
        data: {
          userId: porEmail.id,
          provider: 'google',
          providerAccountId: perfil.providerAccountId,
          scope: 'openid email profile',
        },
      });

      await this.prisma.user.update({
        where: { id: porEmail.id },
        data: {
          emailVerifiedAt: new Date(),
          avatarUrl: porEmail.avatarUrl ?? perfil.avatarUrl,
        },
      });

      await this.registrarAtividade(porEmail.id, ActivityAction.logged_in, contexto);
      return this.tokens.criarSessao({ id: porEmail.id, email: porEmail.email }, contexto);
    }

    const novo = await this.prisma.user.create({
      data: {
        name: perfil.name,
        email: perfil.email,
        avatarUrl: perfil.avatarUrl,
        emailVerifiedAt: perfil.emailVerificado ? new Date() : null,
        preferences: { create: {} },
        accounts: {
          create: {
            provider: 'google',
            providerAccountId: perfil.providerAccountId,
            scope: 'openid email profile',
          },
        },
      },
      select: { id: true, email: true },
    });

    await this.registrarAtividade(novo.id, ActivityAction.created, contexto);
    return this.tokens.criarSessao(novo, contexto);
  }

  // ---------------------------------------------------------------------------

  async buscarSessao(userId: string) {
    return this.users.buscarPerfilPublico(userId);
  }

  private async registrarAtividade(
    userId: string,
    acao: ActivityAction,
    contexto: ContextoDaRequisicao,
  ): Promise<void> {
    await this.prisma.activityLog.create({
      data: {
        userId,
        action: acao,
        entityType: ActivityEntity.user,
        entityId: userId,
        ipAddress: contexto.ipAddress?.slice(0, 64),
      },
    });
  }
}
