import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { expandirOcorrencias, type EventoBruto } from './calendar.helpers';

interface PreferenciasDeNotificacao {
  email?: boolean;
  reminders?: boolean;
}

const INTERVALO_DO_TICK_MINUTOS = 5;

/**
 * Envia o lembrete por e-mail de eventos do calendario.
 *
 * Roda a cada 5 minutos. Para cada evento com lembrete configurado, expande
 * so a janela estreita em que o lembrete DESSE evento cairia agora, e manda
 * no maximo uma vez por ocorrencia (controlado por
 * CalendarEventReminderLog). Funciona igual para evento unico e recorrente,
 * porque os dois passam pelo mesmo expandirOcorrencias.
 */
@Injectable()
export class CalendarRemindersService {
  private readonly logger = new Logger(CalendarRemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  @Cron('*/5 * * * *')
  async enviarLembretesPendentes(): Promise<void> {
    const agora = new Date();

    const eventos = await this.prisma.calendarEvent.findMany({
      where: { reminderMinutesBefore: { not: null }, deletedAt: null, archivedAt: null },
      include: {
        user: {
          select: {
            email: true,
            name: true,
            preferences: { select: { notifications: true } },
          },
        },
      },
    });

    for (const evento of eventos) {
      await this.processarEvento(evento, agora).catch((erro) => {
        this.logger.error(
          `Falha ao processar lembretes do evento ${evento.id}`,
          erro instanceof Error ? erro.stack : String(erro),
        );
      });
    }
  }

  private async processarEvento(
    evento: EventoBruto & {
      reminderMinutesBefore: number | null;
      user: {
        email: string;
        name: string;
        preferences: { notifications: unknown } | null;
      };
    },
    agora: Date,
  ): Promise<void> {
    const minutos = evento.reminderMinutesBefore;
    if (minutos === null) return;

    // So vale a pena expandir a janela em que "inicio - minutos" cai no tick atual.
    const desde = new Date(agora.getTime() + minutos * 60_000);
    const ate = new Date(agora.getTime() + (minutos + INTERVALO_DO_TICK_MINUTOS) * 60_000);

    const ocorrencias = expandirOcorrencias(evento, desde, ate);

    for (const ocorrencia of ocorrencias) {
      await this.avisarOcorrencia(evento, ocorrencia.inicio);
    }
  }

  private async avisarOcorrencia(
    evento: EventoBruto & {
      user: { email: string; name: string; preferences: { notifications: unknown } | null };
    },
    inicioDaOcorrencia: Date,
  ): Promise<void> {
    try {
      await this.prisma.calendarEventReminderLog.create({
        data: { eventId: evento.id, occurrenceStartAt: inicioDaOcorrencia },
      });
    } catch {
      // Ja avisado (violacao da unique constraint): nada a fazer.
      return;
    }

    const preferencias = evento.user.preferences?.notifications as
      PreferenciasDeNotificacao | undefined;
    const podeEnviar = (preferencias?.email ?? true) && (preferencias?.reminders ?? true);

    if (!podeEnviar) return;

    const quando = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(inicioDaOcorrencia);

    await this.mail.enviarLembreteDeEvento(
      evento.user.email,
      evento.user.name,
      evento.title,
      quando,
    );
  }
}
