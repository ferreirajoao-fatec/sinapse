import { z } from 'zod';
import { ENTITY_COLORS, RECURRENCE_FREQUENCIES } from '../constants';

/**
 * Contratos do calendario: evento e recorrencia.
 * Os mesmos schemas validam o formulario no navegador e o corpo na API.
 */

const tituloDoEvento = z
  .string()
  .trim()
  .min(1, 'Informe um titulo')
  .max(200, 'No maximo 200 caracteres');

const linkOpcional = z
  .string()
  .trim()
  .url('Use um endereco comecando com http:// ou https://')
  .max(500)
  .nullable()
  .optional();

export const criarEventoSchema = z
  .object({
    title: tituloDoEvento,
    description: z.string().trim().max(4000, 'No maximo 4000 caracteres').nullable().optional(),
    location: z.string().trim().max(200, 'No maximo 200 caracteres').nullable().optional(),
    link: linkOpcional,
    color: z.enum(ENTITY_COLORS).default('indigo'),
    allDay: z.boolean().default(false),
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    recurrenceFreq: z.enum(RECURRENCE_FREQUENCIES).default('none'),
    recurrenceInterval: z.number().int().min(1).max(365).default(1),
    recurrenceUntil: z.string().datetime().nullable().optional(),
    reminderMinutesBefore: z.number().int().min(0).max(10080).nullable().optional(),
  })
  .refine((dados) => new Date(dados.endAt).getTime() >= new Date(dados.startAt).getTime(), {
    message: 'O fim precisa ser igual ou depois do inicio',
    path: ['endAt'],
  });

export const atualizarEventoSchema = z
  .object({
    title: tituloDoEvento.optional(),
    description: z.string().trim().max(4000, 'No maximo 4000 caracteres').nullable().optional(),
    location: z.string().trim().max(200, 'No maximo 200 caracteres').nullable().optional(),
    link: linkOpcional,
    color: z.enum(ENTITY_COLORS).optional(),
    allDay: z.boolean().optional(),
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    recurrenceFreq: z.enum(RECURRENCE_FREQUENCIES).optional(),
    recurrenceInterval: z.number().int().min(1).max(365).optional(),
    recurrenceUntil: z.string().datetime().nullable().optional(),
    reminderMinutesBefore: z.number().int().min(0).max(10080).nullable().optional(),
    archived: z.boolean().optional(),
  })
  .refine(
    (dados) =>
      !dados.startAt ||
      !dados.endAt ||
      new Date(dados.endAt).getTime() >= new Date(dados.startAt).getTime(),
    { message: 'O fim precisa ser igual ou depois do inicio', path: ['endAt'] },
  );

// -----------------------------------------------------------------------------
// Tipos de resposta
// -----------------------------------------------------------------------------

export interface EventoCompleto {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  link: string | null;
  color: (typeof ENTITY_COLORS)[number];
  allDay: boolean;
  startAt: string;
  endAt: string;
  recurrenceFreq: (typeof RECURRENCE_FREQUENCIES)[number];
  recurrenceInterval: number;
  recurrenceUntil: string | null;
  reminderMinutesBefore: number | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Uma ocorrencia especifica de um evento (a serie inteira, se recorrente). */
export interface OcorrenciaDeEvento {
  eventId: string;
  title: string;
  color: (typeof ENTITY_COLORS)[number];
  allDay: boolean;
  location: string | null;
  link: string | null;
  inicio: string;
  fim: string;
  recorrente: boolean;
}

export type CriarEventoInput = z.infer<typeof criarEventoSchema>;
export type AtualizarEventoInput = z.infer<typeof atualizarEventoSchema>;
