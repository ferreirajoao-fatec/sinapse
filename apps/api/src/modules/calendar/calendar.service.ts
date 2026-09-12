import { ForbiddenException, Injectable } from '@nestjs/common';
import { ActivityAction, ActivityEntity } from '@prisma/client';
import type {
  AtualizarEventoInput,
  CriarEventoInput,
  EventoCompleto,
  OcorrenciaDeEvento,
} from '@sinapse/shared';
import type { PrismaEscopado } from '../../common/prisma/escopo-do-usuario';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  type EventoBruto,
  exigirEncontrado,
  expandirOcorrencias,
  montarEvento,
  montarOcorrencia,
} from './calendar.helpers';

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  /** Ocorrencias (eventos ja expandidos pela recorrencia) dentro de [from, to]. */
  async listarOcorrencias(
    userId: string,
    from: Date,
    to: Date,
    incluirArquivados = false,
  ): Promise<OcorrenciaDeEvento[]> {
    const db = this.prisma.paraUsuario(userId);

    const eventos = await db.calendarEvent.findMany({
      where: {
        deletedAt: null,
        ...(incluirArquivados ? {} : { archivedAt: null }),
        // Um evento so pode gerar ocorrencias em [from,to] se comecou antes
        // de "to" e (nao tem fim de recorrencia ou esse fim e depois de "from").
        startAt: { lte: to },
        OR: [{ recurrenceUntil: null }, { recurrenceUntil: { gte: from } }],
      },
    });

    const ocorrencias = eventos.flatMap((evento) =>
      expandirOcorrencias(evento as EventoBruto, from, to).map((ocorrencia) =>
        montarOcorrencia(evento as EventoBruto, ocorrencia),
      ),
    );

    return ocorrencias.sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
  }

  async criar(userId: string, dados: CriarEventoInput): Promise<EventoCompleto> {
    const evento = await this.prisma.calendarEvent.create({
      data: {
        userId,
        title: dados.title,
        description: dados.description ?? null,
        location: dados.location ?? null,
        link: dados.link ?? null,
        color: dados.color,
        allDay: dados.allDay,
        startAt: new Date(dados.startAt),
        endAt: new Date(dados.endAt),
        recurrenceFreq: dados.recurrenceFreq,
        recurrenceInterval: dados.recurrenceInterval,
        recurrenceUntil: dados.recurrenceUntil ? new Date(dados.recurrenceUntil) : null,
        reminderMinutesBefore: dados.reminderMinutesBefore ?? null,
      },
    });

    await this.registrar(userId, ActivityAction.created, evento.id);

    return montarEvento(evento);
  }

  async atualizar(
    userId: string,
    eventoId: string,
    dados: AtualizarEventoInput,
  ): Promise<EventoCompleto> {
    const db = this.prisma.paraUsuario(userId);

    const alterados = await db.calendarEvent.updateMany({
      where: { id: eventoId, deletedAt: null },
      data: {
        ...(dados.title !== undefined ? { title: dados.title } : {}),
        ...(dados.description !== undefined ? { description: dados.description } : {}),
        ...(dados.location !== undefined ? { location: dados.location } : {}),
        ...(dados.link !== undefined ? { link: dados.link } : {}),
        ...(dados.color !== undefined ? { color: dados.color } : {}),
        ...(dados.allDay !== undefined ? { allDay: dados.allDay } : {}),
        ...(dados.startAt !== undefined ? { startAt: new Date(dados.startAt) } : {}),
        ...(dados.endAt !== undefined ? { endAt: new Date(dados.endAt) } : {}),
        ...(dados.recurrenceFreq !== undefined ? { recurrenceFreq: dados.recurrenceFreq } : {}),
        ...(dados.recurrenceInterval !== undefined
          ? { recurrenceInterval: dados.recurrenceInterval }
          : {}),
        ...(dados.recurrenceUntil !== undefined
          ? { recurrenceUntil: dados.recurrenceUntil ? new Date(dados.recurrenceUntil) : null }
          : {}),
        ...(dados.reminderMinutesBefore !== undefined
          ? { reminderMinutesBefore: dados.reminderMinutesBefore }
          : {}),
        ...(dados.archived !== undefined ? { archivedAt: dados.archived ? new Date() : null } : {}),
      },
    });

    if (alterados.count === 0) {
      throw new ForbiddenException('Evento nao encontrado ou nao pertence a sua conta.');
    }

    await this.registrar(
      userId,
      dados.archived !== undefined ? ActivityAction.archived : ActivityAction.updated,
      eventoId,
    );

    return this.buscar(userId, eventoId);
  }

  async buscar(userId: string, eventoId: string): Promise<EventoCompleto> {
    const db = this.prisma.paraUsuario(userId);

    const evento = await db.calendarEvent.findFirst({ where: { id: eventoId, deletedAt: null } });

    return montarEvento(exigirEncontrado(evento, 'Evento nao encontrado.'));
  }

  async excluir(userId: string, eventoId: string): Promise<void> {
    const db = this.prisma.paraUsuario(userId);

    const alterados = await db.calendarEvent.updateMany({
      where: { id: eventoId, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    if (alterados.count === 0) {
      throw new ForbiddenException('Evento nao encontrado ou nao pertence a sua conta.');
    }

    await this.registrar(userId, ActivityAction.deleted, eventoId);
  }

  /** Usado pelo TasksService ao vincular uma tarefa a um evento. */
  async exigirEventoProprio(db: PrismaEscopado, eventoId: string): Promise<void> {
    const evento = await db.calendarEvent.findFirst({
      where: { id: eventoId, deletedAt: null },
      select: { id: true },
    });

    if (!evento) {
      throw new ForbiddenException('Evento nao encontrado ou nao pertence a sua conta.');
    }
  }

  private async registrar(userId: string, acao: ActivityAction, entityId: string): Promise<void> {
    await this.prisma.activityLog.create({
      data: { userId, action: acao, entityType: ActivityEntity.calendar_event, entityId },
    });
  }
}
