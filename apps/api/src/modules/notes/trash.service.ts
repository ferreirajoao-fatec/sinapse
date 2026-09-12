import { ForbiddenException, Injectable } from '@nestjs/common';
import { ActivityAction, ActivityEntity } from '@prisma/client';
import type { ItemDaLixeira, TipoNaLixeira } from '@sinapse/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class TrashService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lixeira unificada.
   *
   * Quando um grupo e excluido, suas secoes e paginas recebem o MESMO carimbo
   * de data. A lixeira mostra so o item de nivel mais alto de cada exclusao,
   * senao um grupo com 40 paginas viraria 41 linhas para restaurar uma a uma.
   */
  async listar(userId: string): Promise<ItemDaLixeira[]> {
    const db = this.prisma.paraUsuario(userId);

    const [grupos, secoes, paginas, colunas, tarefas, eventos] = await Promise.all([
      db.group.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
        include: { _count: { select: { sections: true } } },
      }),
      db.section.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
        include: {
          group: { select: { name: true, deletedAt: true } },
          _count: { select: { pages: true } },
        },
      }),
      db.page.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
        include: {
          section: { select: { name: true, deletedAt: true, group: { select: { name: true } } } },
        },
      }),
      db.taskColumn.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
        include: { _count: { select: { tasks: true } } },
      }),
      db.task.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
        include: { column: { select: { name: true, deletedAt: true } } },
      }),
      db.calendarEvent.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
      }),
    ]);

    const itens: ItemDaLixeira[] = [];

    for (const grupo of grupos) {
      itens.push({
        tipo: 'grupo',
        id: grupo.id,
        nome: grupo.name,
        icone: grupo.icon,
        excluidoEm: grupo.deletedAt!.toISOString(),
        contexto: null,
        filhos: grupo._count.sections,
      });
    }

    for (const secao of secoes) {
      // Se o grupo tambem esta na lixeira, esta secao caiu junto.
      if (secao.group.deletedAt) continue;

      itens.push({
        tipo: 'secao',
        id: secao.id,
        nome: secao.name,
        icone: secao.icon,
        excluidoEm: secao.deletedAt!.toISOString(),
        contexto: secao.group.name,
        filhos: secao._count.pages,
      });
    }

    for (const pagina of paginas) {
      if (pagina.section.deletedAt) continue;

      // Subpagina que caiu junto com a pagina superior tambem nao aparece
      // sozinha; a restauracao da superior traz ela de volta.
      if (pagina.parentPageId) {
        const superior = paginas.find((outra) => outra.id === pagina.parentPageId);
        if (superior && superior.deletedAt?.getTime() === pagina.deletedAt?.getTime()) continue;
      }

      itens.push({
        tipo: 'pagina',
        id: pagina.id,
        nome: pagina.title,
        icone: pagina.icon,
        excluidoEm: pagina.deletedAt!.toISOString(),
        contexto: `${pagina.section.group.name} / ${pagina.section.name}`,
        filhos: 0,
      });
    }

    for (const coluna of colunas) {
      itens.push({
        tipo: 'coluna_de_tarefas',
        id: coluna.id,
        nome: coluna.name,
        icone: null,
        excluidoEm: coluna.deletedAt!.toISOString(),
        contexto: null,
        filhos: coluna._count.tasks,
      });
    }

    for (const tarefa of tarefas) {
      // Se a coluna tambem esta na lixeira, esta tarefa caiu junto.
      if (tarefa.column.deletedAt) continue;

      itens.push({
        tipo: 'tarefa',
        id: tarefa.id,
        nome: tarefa.title,
        icone: null,
        excluidoEm: tarefa.deletedAt!.toISOString(),
        contexto: tarefa.column.name,
        filhos: 0,
      });
    }

    for (const evento of eventos) {
      itens.push({
        tipo: 'evento',
        id: evento.id,
        nome: evento.title,
        icone: null,
        excluidoEm: evento.deletedAt!.toISOString(),
        contexto: null,
        filhos: 0,
      });
    }

    return itens.sort(
      (a, b) => new Date(b.excluidoEm).getTime() - new Date(a.excluidoEm).getTime(),
    );
  }

  /**
   * Restaura o item e tudo o que caiu junto com ele.
   * A identificacao do "junto" e o carimbo de data ser exatamente o mesmo.
   */
  async restaurar(userId: string, tipo: TipoNaLixeira, id: string): Promise<void> {
    const db = this.prisma.paraUsuario(userId);

    if (tipo === 'grupo') {
      const grupo = await db.group.findFirst({ where: { id, deletedAt: { not: null } } });

      if (!grupo) {
        throw new ForbiddenException('Grupo nao encontrado na lixeira.');
      }

      const quando = grupo.deletedAt!;

      await db.group.updateMany({ where: { id }, data: { deletedAt: null } });
      await db.section.updateMany({
        where: { groupId: id, deletedAt: quando },
        data: { deletedAt: null },
      });
      await db.page.updateMany({
        where: { section: { groupId: id }, deletedAt: quando },
        data: { deletedAt: null },
      });

      await this.registrar(userId, ActivityEntity.group, id);
      return;
    }

    if (tipo === 'secao') {
      const secao = await db.section.findFirst({
        where: { id, deletedAt: { not: null } },
        include: { group: { select: { deletedAt: true } } },
      });

      if (!secao) {
        throw new ForbiddenException('Secao nao encontrada na lixeira.');
      }

      // Nao adianta restaurar a secao para dentro de um grupo excluido.
      if (secao.group.deletedAt) {
        throw new ForbiddenException('Restaure primeiro o grupo, e esta secao volta junto.');
      }

      const quando = secao.deletedAt!;

      await db.section.updateMany({ where: { id }, data: { deletedAt: null } });
      await db.page.updateMany({
        where: { sectionId: id, deletedAt: quando },
        data: { deletedAt: null },
      });

      await this.registrar(userId, ActivityEntity.section, id);
      return;
    }

    if (tipo === 'pagina') {
      const pagina = await db.page.findFirst({
        where: { id, deletedAt: { not: null } },
        include: {
          section: { select: { deletedAt: true, group: { select: { deletedAt: true } } } },
        },
      });

      if (!pagina) {
        throw new ForbiddenException('Pagina nao encontrada na lixeira.');
      }

      if (pagina.section.deletedAt || pagina.section.group.deletedAt) {
        throw new ForbiddenException(
          'A secao desta pagina esta na lixeira. Restaure a secao primeiro.',
        );
      }

      const quando = pagina.deletedAt!;

      await db.page.updateMany({ where: { id }, data: { deletedAt: null } });

      // Subpaginas que cairam no mesmo instante voltam junto.
      let nivel = [id];
      while (nivel.length > 0) {
        const filhas = await db.page.findMany({
          where: { parentPageId: { in: nivel }, deletedAt: quando },
          select: { id: true },
        });

        if (filhas.length === 0) break;

        const ids = filhas.map((filha) => filha.id);
        await db.page.updateMany({ where: { id: { in: ids } }, data: { deletedAt: null } });
        nivel = ids;
      }

      await this.registrar(userId, ActivityEntity.page, id);
      return;
    }

    if (tipo === 'coluna_de_tarefas') {
      const coluna = await db.taskColumn.findFirst({ where: { id, deletedAt: { not: null } } });

      if (!coluna) {
        throw new ForbiddenException('Coluna nao encontrada na lixeira.');
      }

      const quando = coluna.deletedAt!;

      await db.taskColumn.updateMany({ where: { id }, data: { deletedAt: null } });
      await db.task.updateMany({
        where: { columnId: id, deletedAt: quando },
        data: { deletedAt: null },
      });

      await this.registrar(userId, ActivityEntity.task_column, id);
      return;
    }

    if (tipo === 'tarefa') {
      const tarefa = await db.task.findFirst({
        where: { id, deletedAt: { not: null } },
        include: { column: { select: { deletedAt: true } } },
      });

      if (!tarefa) {
        throw new ForbiddenException('Tarefa nao encontrada na lixeira.');
      }

      if (tarefa.column.deletedAt) {
        throw new ForbiddenException(
          'A coluna desta tarefa esta na lixeira. Restaure a coluna primeiro.',
        );
      }

      await db.task.updateMany({ where: { id }, data: { deletedAt: null } });

      await this.registrar(userId, ActivityEntity.task, id);
      return;
    }

    // tipo === 'evento'
    const evento = await db.calendarEvent.findFirst({ where: { id, deletedAt: { not: null } } });

    if (!evento) {
      throw new ForbiddenException('Evento nao encontrado na lixeira.');
    }

    await db.calendarEvent.updateMany({ where: { id }, data: { deletedAt: null } });

    await this.registrar(userId, ActivityEntity.calendar_event, id);
  }

  /** Exclusao definitiva de um item. A cascata do banco leva os filhos. */
  async excluirDefinitivamente(userId: string, tipo: TipoNaLixeira, id: string): Promise<void> {
    const db = this.prisma.paraUsuario(userId);

    const removidos = await this.deletarPorTipo(db, tipo, { id, deletedAt: { not: null } });

    if (removidos.count === 0) {
      throw new ForbiddenException('Item nao encontrado na lixeira.');
    }
  }

  private async deletarPorTipo(
    db: ReturnType<PrismaService['paraUsuario']>,
    tipo: TipoNaLixeira,
    where: { id: string; deletedAt: { not: null } },
  ): Promise<{ count: number }> {
    switch (tipo) {
      case 'grupo':
        return db.group.deleteMany({ where });
      case 'secao':
        return db.section.deleteMany({ where });
      case 'pagina':
        return db.page.deleteMany({ where });
      case 'coluna_de_tarefas':
        return db.taskColumn.deleteMany({ where });
      case 'tarefa':
        return db.task.deleteMany({ where });
      case 'evento':
        return db.calendarEvent.deleteMany({ where });
    }
  }

  /** Esvazia a lixeira inteira. Grupos e colunas primeiro, para a cascata fazer o resto. */
  async esvaziar(userId: string): Promise<{ removidos: number }> {
    const db = this.prisma.paraUsuario(userId);

    const grupos = await db.group.deleteMany({ where: { deletedAt: { not: null } } });
    const secoes = await db.section.deleteMany({ where: { deletedAt: { not: null } } });
    const paginas = await db.page.deleteMany({ where: { deletedAt: { not: null } } });
    const colunas = await db.taskColumn.deleteMany({ where: { deletedAt: { not: null } } });
    const tarefas = await db.task.deleteMany({ where: { deletedAt: { not: null } } });
    const eventos = await db.calendarEvent.deleteMany({ where: { deletedAt: { not: null } } });

    return {
      removidos:
        grupos.count + secoes.count + paginas.count + colunas.count + tarefas.count + eventos.count,
    };
  }

  private async registrar(
    userId: string,
    entityType: ActivityEntity,
    entityId: string,
  ): Promise<void> {
    await this.prisma.activityLog.create({
      data: { userId, action: ActivityAction.restored, entityType, entityId },
    });
  }
}
