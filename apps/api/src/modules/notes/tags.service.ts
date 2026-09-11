import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import type { AtualizarEtiquetaInput, CriarEtiquetaInput, EtiquetaResumida } from '@sinapse/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { exigirEncontrado } from './notes.helpers';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(userId: string): Promise<EtiquetaResumida[]> {
    const db = this.prisma.paraUsuario(userId);

    const etiquetas = await db.tag.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { pages: true } } },
    });

    return etiquetas.map((etiqueta) => ({
      id: etiqueta.id,
      name: etiqueta.name,
      color: etiqueta.color,
      totalDePaginas: etiqueta._count.pages,
    }));
  }

  async criar(userId: string, dados: CriarEtiquetaInput): Promise<EtiquetaResumida> {
    const db = this.prisma.paraUsuario(userId);

    const existente = await db.tag.findFirst({ where: { name: dados.name } });

    if (existente) {
      throw new ConflictException('Voce ja tem uma etiqueta com este nome.');
    }

    const etiqueta = await this.prisma.tag.create({
      data: { userId, name: dados.name, color: dados.color },
    });

    return { id: etiqueta.id, name: etiqueta.name, color: etiqueta.color, totalDePaginas: 0 };
  }

  async atualizar(
    userId: string,
    etiquetaId: string,
    dados: AtualizarEtiquetaInput,
  ): Promise<EtiquetaResumida> {
    const db = this.prisma.paraUsuario(userId);

    if (dados.name) {
      const conflito = await db.tag.findFirst({
        where: { name: dados.name, id: { not: etiquetaId } },
      });

      if (conflito) {
        throw new ConflictException('Voce ja tem uma etiqueta com este nome.');
      }
    }

    const alteradas = await db.tag.updateMany({
      where: { id: etiquetaId },
      data: {
        ...(dados.name !== undefined ? { name: dados.name } : {}),
        ...(dados.color !== undefined ? { color: dados.color } : {}),
      },
    });

    if (alteradas.count === 0) {
      throw new ForbiddenException('Etiqueta nao encontrada ou nao pertence a sua conta.');
    }

    const etiqueta = exigirEncontrado(
      await db.tag.findFirst({
        where: { id: etiquetaId },
        include: { _count: { select: { pages: true } } },
      }),
      'Etiqueta nao encontrada.',
    );

    return {
      id: etiqueta.id,
      name: etiqueta.name,
      color: etiqueta.color,
      totalDePaginas: etiqueta._count.pages,
    };
  }

  /**
   * Excluir uma etiqueta nao apaga pagina nenhuma: a cascata remove apenas
   * os vinculos em page_tags.
   */
  async excluir(userId: string, etiquetaId: string): Promise<void> {
    const db = this.prisma.paraUsuario(userId);
    const removidas = await db.tag.deleteMany({ where: { id: etiquetaId } });

    if (removidas.count === 0) {
      throw new ForbiddenException('Etiqueta nao encontrada ou nao pertence a sua conta.');
    }
  }
}
