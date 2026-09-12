import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';
import { ActivityAction, ActivityEntity } from '@prisma/client';
import type {
  AlterarSenhaInput,
  AtualizarPerfilInput,
  AtualizarPreferenciasInput,
  UsuarioPublico,
} from '@sinapse/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  /**
   * Monta o objeto publico do usuario.
   * Nunca inclui passwordHash, tokens nem dados de outro usuario.
   */
  async buscarPerfilPublico(userId: string): Promise<UsuarioPublico> {
    const usuario = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        preferences: true,
        accounts: { select: { provider: true } },
      },
    });

    if (!usuario) {
      throw new NotFoundException('Conta nao encontrada.');
    }

    return {
      id: usuario.id,
      name: usuario.name,
      email: usuario.email,
      avatarUrl: usuario.avatarUrl,
      emailVerified: usuario.emailVerifiedAt !== null,
      hasPassword: usuario.passwordHash !== null,
      connectedProviders: usuario.accounts.map((conta) => conta.provider),
      storageUsedBytes: Number(usuario.storageUsedBytes),
      storageQuotaBytes: Number(usuario.storageQuotaBytes),
      createdAt: usuario.createdAt.toISOString(),
      preferences: {
        theme: usuario.preferences?.theme ?? 'system',
        locale: usuario.preferences?.locale === 'en_US' ? 'en-US' : 'pt-BR',
        fontScale: usuario.preferences?.fontScale ?? 100,
        reducedMotion: usuario.preferences?.reducedMotion ?? false,
        aiEnabled: usuario.preferences?.aiEnabled ?? false,
      },
    };
  }

  async atualizarPerfil(userId: string, dados: AtualizarPerfilInput): Promise<UsuarioPublico> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dados.name !== undefined ? { name: dados.name } : {}),
        ...(dados.avatarUrl !== undefined ? { avatarUrl: dados.avatarUrl } : {}),
      },
    });

    await this.registrar(userId, ActivityAction.updated);

    return this.buscarPerfilPublico(userId);
  }

  async atualizarPreferencias(
    userId: string,
    dados: AtualizarPreferenciasInput,
  ): Promise<UsuarioPublico> {
    const locale =
      dados.locale === 'en-US' ? 'en_US' : dados.locale === 'pt-BR' ? 'pt_BR' : undefined;

    await this.prisma.userPreferences.upsert({
      where: { userId },
      create: {
        userId,
        ...(dados.theme ? { theme: dados.theme } : {}),
        ...(locale ? { locale } : {}),
        ...(dados.fontScale !== undefined ? { fontScale: dados.fontScale } : {}),
        ...(dados.reducedMotion !== undefined ? { reducedMotion: dados.reducedMotion } : {}),
      },
      update: {
        ...(dados.theme ? { theme: dados.theme } : {}),
        ...(locale ? { locale } : {}),
        ...(dados.fontScale !== undefined ? { fontScale: dados.fontScale } : {}),
        ...(dados.reducedMotion !== undefined ? { reducedMotion: dados.reducedMotion } : {}),
      },
    });

    return this.buscarPerfilPublico(userId);
  }

  /**
   * Troca a senha. Exige a senha atual, mesmo com sessao ativa:
   * protege quem esqueceu o computador desbloqueado.
   */
  async alterarSenha(userId: string, dados: AlterarSenhaInput): Promise<void> {
    const usuario = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, email: true, name: true, passwordHash: true },
    });

    if (!usuario) {
      throw new NotFoundException('Conta nao encontrada.');
    }

    if (!usuario.passwordHash) {
      throw new BadRequestException(
        'Sua conta ainda nao tem senha. Use "Esqueci minha senha" para criar a primeira.',
      );
    }

    const confere = await verify(usuario.passwordHash, dados.senhaAtual);

    if (!confere) {
      throw new BadRequestException('A senha atual esta incorreta.');
    }

    if (dados.senhaAtual === dados.novaSenha) {
      throw new BadRequestException('A nova senha precisa ser diferente da atual.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hash(dados.novaSenha) },
    });

    await this.mail.enviarAvisoDeSenhaAlterada(usuario.email, usuario.name);
    await this.registrar(userId, ActivityAction.password_changed);
  }

  async temSenha(userId: string): Promise<boolean> {
    const usuario = await this.prisma.user.findFirst({
      where: { id: userId },
      select: { passwordHash: true },
    });

    return usuario?.passwordHash !== null && usuario?.passwordHash !== undefined;
  }

  /**
   * Exclusao definitiva. A cascata do banco remove sessoes, grupos, paginas,
   * tags e registros de atividade. Nao ha copia residual.
   */
  async excluirConta(userId: string, senha?: string): Promise<void> {
    const usuario = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, passwordHash: true },
    });

    if (!usuario) {
      throw new NotFoundException('Conta nao encontrada.');
    }

    // Contas com senha exigem a senha; contas so com Google nao tem o que pedir.
    if (usuario.passwordHash) {
      if (!senha) {
        throw new BadRequestException('Informe sua senha para confirmar a exclusao.');
      }

      const confere = await verify(usuario.passwordHash, senha);

      if (!confere) {
        throw new BadRequestException('Senha incorreta.');
      }
    }

    await this.prisma.user.delete({ where: { id: userId } });
  }

  /** Exportacao dos dados pessoais, exigida pela LGPD. */
  async exportarDados(userId: string) {
    const usuario = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        preferences: true,
        accounts: { select: { provider: true, createdAt: true } },
        groups: {
          include: {
            sections: {
              include: {
                pages: {
                  select: {
                    title: true,
                    content: true,
                    contentText: true,
                    createdAt: true,
                    updatedAt: true,
                  },
                },
              },
            },
          },
        },
        tags: { select: { name: true, color: true } },
      },
    });

    if (!usuario) {
      throw new NotFoundException('Conta nao encontrada.');
    }

    return {
      exportadoEm: new Date().toISOString(),
      usuario: {
        nome: usuario.name,
        email: usuario.email,
        criadoEm: usuario.createdAt.toISOString(),
        emailVerificadoEm: usuario.emailVerifiedAt?.toISOString() ?? null,
      },
      preferencias: usuario.preferences,
      contasVinculadas: usuario.accounts,
      grupos: usuario.groups,
      tags: usuario.tags,
    };
  }

  private async registrar(userId: string, acao: ActivityAction): Promise<void> {
    await this.prisma.activityLog.create({
      data: { userId, action: acao, entityType: ActivityEntity.user, entityId: userId },
    });
  }
}
