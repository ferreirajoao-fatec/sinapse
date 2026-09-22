import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ActivityAction, ActivityEntity, SectionRole } from '@prisma/client';
import type {
  AdicionarMembroInput,
  AtualizarMembroInput,
  MembroDaSecao,
  MembrosDaSecao,
  PermissaoNaSecao,
  SecaoCompartilhada,
} from '@sinapse/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { montarSecao, SELECAO_DE_PAGINAS } from './notes.helpers';

const SELECAO_DE_USUARIO = { id: true, name: true, email: true, avatarUrl: true } as const;

/**
 * Secoes compartilhadas.
 *
 * O dono de uma secao e sempre o dono do grupo dela. Ele convida outras
 * contas pelo e-mail e escolhe, para cada uma, se so le ou tambem edita.
 * Quem aplica essas permissoes nas paginas e o cliente escopado, no nivel
 * "leitura" ou "edicao"; este servico cuida da lista de membros.
 */
@Injectable()
export class SharingService {
  private readonly logger = new Logger(SharingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  /** O que a conta pode fazer na secao, ou null se nao tem acesso nenhum. */
  async permissaoNaSecao(userId: string, secaoId: string): Promise<PermissaoNaSecao | null> {
    const secao = await this.prisma.paraUsuario(userId, 'leitura').section.findFirst({
      where: { id: secaoId, deletedAt: null },
      select: {
        group: { select: { userId: true } },
        members: { where: { userId }, select: { role: true } },
      },
    });

    if (!secao) return null;
    if (secao.group.userId === userId) return 'dono';

    return secao.members[0]?.role === SectionRole.editor ? 'editor' : 'leitor';
  }

  async listarMembros(userId: string, secaoId: string): Promise<MembrosDaSecao> {
    const secao = await this.prisma.paraUsuario(userId, 'leitura').section.findFirst({
      where: { id: secaoId, deletedAt: null },
      select: {
        createdAt: true,
        group: { select: { user: { select: SELECAO_DE_USUARIO } } },
        members: {
          orderBy: { createdAt: 'asc' },
          select: { role: true, createdAt: true, user: { select: SELECAO_DE_USUARIO } },
        },
      },
    });

    if (!secao) {
      throw new NotFoundException('Secao nao encontrada.');
    }

    const dono = secao.group.user;

    const membros: MembroDaSecao[] = [
      {
        userId: dono.id,
        nome: dono.name,
        email: dono.email,
        avatarUrl: dono.avatarUrl,
        role: 'owner',
        desde: secao.createdAt.toISOString(),
      },
      ...secao.members.map((membro) => ({
        userId: membro.user.id,
        nome: membro.user.name,
        email: membro.user.email,
        avatarUrl: membro.user.avatarUrl,
        role: membro.role,
        desde: membro.createdAt.toISOString(),
      })),
    ];

    return { secaoId, membros, podeGerenciar: dono.id === userId };
  }

  async adicionarMembro(
    userId: string,
    secaoId: string,
    dados: AdicionarMembroInput,
  ): Promise<MembrosDaSecao> {
    const secao = await this.exigirSecaoPropria(userId, secaoId);

    const convidado = await this.prisma.user.findFirst({
      where: { email: dados.email, deletedAt: null },
      select: { id: true, name: true, email: true },
    });

    if (!convidado) {
      throw new NotFoundException(
        'Nenhuma conta do Sinapse usa este e-mail. Peca para a pessoa criar uma conta primeiro.',
      );
    }

    if (convidado.id === userId) {
      throw new BadRequestException('Voce ja e o dono desta secao.');
    }

    const existente = await this.prisma.sectionMember.findFirst({
      where: { sectionId: secaoId, userId: convidado.id },
      select: { id: true },
    });

    if (existente) {
      throw new ConflictException('Esta pessoa ja tem acesso a secao.');
    }

    await this.prisma.sectionMember.create({
      data: { sectionId: secaoId, userId: convidado.id, role: dados.role },
    });

    await this.registrar(userId, ActivityAction.created, secaoId, {
      membro: convidado.id,
      papel: dados.role,
    });

    // O convite ja vale; se o e-mail falhar, a secao aparece do mesmo jeito.
    void this.mail
      .enviarAvisoDeSecaoCompartilhada(
        convidado.email,
        convidado.name,
        secao.donoNome,
        secao.nome,
        dados.role === SectionRole.editor,
      )
      .catch((erro: unknown) =>
        this.logger.warn(`Aviso de compartilhamento nao enviado: ${String(erro)}`),
      );

    return this.listarMembros(userId, secaoId);
  }

  async atualizarMembro(
    userId: string,
    secaoId: string,
    membroId: string,
    dados: AtualizarMembroInput,
  ): Promise<MembrosDaSecao> {
    await this.exigirSecaoPropria(userId, secaoId);

    const alterados = await this.prisma.paraUsuario(userId).sectionMember.updateMany({
      where: { sectionId: secaoId, userId: membroId },
      data: { role: dados.role },
    });

    if (alterados.count === 0) {
      throw new NotFoundException('Esta pessoa nao e membro da secao.');
    }

    await this.registrar(userId, ActivityAction.updated, secaoId, {
      membro: membroId,
      papel: dados.role,
    });

    return this.listarMembros(userId, secaoId);
  }

  /** O dono remove qualquer membro; um membro pode remover a si mesmo (sair). */
  async removerMembro(userId: string, secaoId: string, membroId: string): Promise<void> {
    const saindo = membroId === userId;
    const db = this.prisma.paraUsuario(userId, saindo ? 'leitura' : 'dono');

    if (!saindo) {
      await this.exigirSecaoPropria(userId, secaoId);
    }

    const removidos = await db.sectionMember.deleteMany({
      where: { sectionId: secaoId, userId: membroId },
    });

    if (removidos.count === 0) {
      throw new NotFoundException('Esta pessoa nao e membro da secao.');
    }

    await this.registrar(userId, ActivityAction.deleted, secaoId, { membro: membroId });
  }

  /** Secoes de outras contas em que esta conta e membro, para a barra lateral. */
  async compartilhadasComigo(userId: string): Promise<SecaoCompartilhada[]> {
    const secoes = await this.prisma.section.findMany({
      where: {
        deletedAt: null,
        archivedAt: null,
        members: { some: { userId } },
        group: { deletedAt: null },
      },
      orderBy: { name: 'asc' },
      include: {
        pages: {
          where: { deletedAt: null, archivedAt: null },
          orderBy: { position: 'asc' },
          select: SELECAO_DE_PAGINAS,
        },
        group: { select: { name: true, user: { select: { name: true, email: true } } } },
        members: { where: { userId }, select: { role: true } },
      },
    });

    return secoes.map((secao) => ({
      ...montarSecao(secao),
      permissao: secao.members[0]?.role === SectionRole.editor ? 'editor' : 'leitor',
      grupo: secao.group.name,
      dono: { nome: secao.group.user.name, email: secao.group.user.email },
    }));
  }

  private async exigirSecaoPropria(
    userId: string,
    secaoId: string,
  ): Promise<{ nome: string; donoNome: string }> {
    const secao = await this.prisma.paraUsuario(userId).section.findFirst({
      where: { id: secaoId, deletedAt: null },
      select: { name: true, group: { select: { user: { select: { name: true } } } } },
    });

    if (!secao) {
      throw new ForbiddenException('So o dono da secao pode gerenciar quem tem acesso.');
    }

    return { nome: secao.name, donoNome: secao.group.user.name };
  }

  private async registrar(
    userId: string,
    acao: ActivityAction,
    secaoId: string,
    metadata: Record<string, string>,
  ): Promise<void> {
    await this.prisma.activityLog.create({
      data: {
        userId,
        action: acao,
        entityType: ActivityEntity.section_member,
        entityId: secaoId,
        metadata,
      },
    });
  }
}
