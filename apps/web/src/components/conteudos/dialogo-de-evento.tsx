'use client';

import {
  atualizarEventoSchema,
  criarEventoSchema,
  RECURRENCE_FREQUENCIES,
  type EntityColor,
  type EventoCompleto,
  type RecurrenceFrequency,
} from '@sinapse/shared';
import { Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialogo } from '@/components/ui/dialogo';
import { Input } from '@/components/ui/input';
import { Interruptor } from '@/components/ui/interruptor';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api';
import { atualizarEvento, buscarEvento, criarEvento, excluirEvento } from '@/lib/calendario';
import {
  NOMES_DE_RECORRENCIA,
  OPCOES_DE_LEMBRETE,
  paraCampoDeData,
  paraCampoDeDataHora,
} from '@/lib/calendario-formatacao';
import { DialogoDeConfirmacao } from './dialogo-de-confirmacao';
import { SeletorDeCor } from './seletor-de-cor';

/** Volta ao formato yyyy-MM-ddTHH:mm somando horas, no fuso local. */
function comHorasAMais(valorDatetimeLocal: string, horas: number): string {
  const data = new Date(valorDatetimeLocal);
  data.setHours(data.getHours() + horas);
  return paraCampoDeDataHora(data.toISOString());
}

function agoraNaProximaHoraCheia(): string {
  const data = new Date();
  data.setMinutes(0, 0, 0);
  data.setHours(data.getHours() + 1);
  return paraCampoDeDataHora(data.toISOString());
}

export function DialogoDeEvento({
  aberto,
  aoFechar,
  aoSalvar,
  eventoId,
  dataInicial,
}: {
  aberto: boolean;
  aoFechar: () => void;
  /** Chamado apos qualquer alteracao, para a grade/agenda recarregar. */
  aoSalvar: () => Promise<void>;
  /** Presente edita o evento existente; ausente cria um novo. */
  eventoId?: string;
  /** Dia pre-selecionado ao criar (ex.: clique num dia vazio da grade), ISO. */
  dataInicial?: string;
}) {
  const [evento, setEvento] = useState<EventoCompleto | null>(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [local, setLocal] = useState('');
  const [link, setLink] = useState('');
  const [cor, setCor] = useState<EntityColor>('indigo');
  const [diaInteiro, setDiaInteiro] = useState(false);
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [recorrenciaFreq, setRecorrenciaFreq] = useState<RecurrenceFrequency>('none');
  const [recorrenciaIntervalo, setRecorrenciaIntervalo] = useState(1);
  const [recorrenciaAte, setRecorrenciaAte] = useState('');
  const [lembrete, setLembrete] = useState('');

  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    if (!aberto) return;

    setErro(null);

    if (!eventoId) {
      const base = dataInicial
        ? paraCampoDeDataHora(new Date(`${dataInicial.slice(0, 10)}T09:00:00`).toISOString())
        : agoraNaProximaHoraCheia();

      setEvento(null);
      setTitulo('');
      setDescricao('');
      setLocal('');
      setLink('');
      setCor('indigo');
      setDiaInteiro(false);
      setInicio(base);
      setFim(comHorasAMais(base, 1));
      setRecorrenciaFreq('none');
      setRecorrenciaIntervalo(1);
      setRecorrenciaAte('');
      setLembrete('');
      return;
    }

    setCarregandoDetalhe(true);
    buscarEvento(eventoId)
      .then((completo) => {
        setEvento(completo);
        setTitulo(completo.title);
        setDescricao(completo.description ?? '');
        setLocal(completo.location ?? '');
        setLink(completo.link ?? '');
        setCor(completo.color);
        setDiaInteiro(completo.allDay);
        setInicio(paraCampoDeDataHora(completo.startAt));
        setFim(paraCampoDeDataHora(completo.endAt));
        setRecorrenciaFreq(completo.recurrenceFreq);
        setRecorrenciaIntervalo(completo.recurrenceInterval);
        setRecorrenciaAte(
          completo.recurrenceUntil ? paraCampoDeData(completo.recurrenceUntil) : '',
        );
        setLembrete(
          completo.reminderMinutesBefore === null ? '' : String(completo.reminderMinutesBefore),
        );
      })
      .catch((falha) => {
        setErro(falha instanceof ApiError ? falha.message : 'Nao foi possivel carregar o evento.');
      })
      .finally(() => setCarregandoDetalhe(false));
  }, [aberto, eventoId, dataInicial]);

  async function enviar(evt: FormEvent) {
    evt.preventDefault();
    setErro(null);

    const dadosComuns = {
      title: titulo,
      description: descricao || null,
      location: local || null,
      link: link || null,
      color: cor,
      allDay: diaInteiro,
      startAt: new Date(inicio).toISOString(),
      endAt: new Date(diaInteiro ? `${inicio.slice(0, 10)}T23:59` : fim).toISOString(),
      recurrenceFreq: recorrenciaFreq,
      recurrenceInterval: recorrenciaIntervalo,
      recurrenceUntil:
        recorrenciaFreq !== 'none' && recorrenciaAte
          ? new Date(`${recorrenciaAte}T23:59:59`).toISOString()
          : null,
      reminderMinutesBefore: lembrete === '' ? null : Number(lembrete),
    };

    if (evento) {
      const validacao = atualizarEventoSchema.safeParse(dadosComuns);

      if (!validacao.success) {
        setErro(validacao.error.issues[0]?.message ?? 'Dados invalidos');
        return;
      }

      setSalvando(true);
      try {
        await atualizarEvento(evento.id, validacao.data);
        await aoSalvar();
        aoFechar();
      } catch (falha) {
        setErro(falha instanceof ApiError ? falha.message : 'Nao foi possivel salvar.');
      } finally {
        setSalvando(false);
      }
      return;
    }

    const validacao = criarEventoSchema.safeParse(dadosComuns);

    if (!validacao.success) {
      setErro(validacao.error.issues[0]?.message ?? 'Dados invalidos');
      return;
    }

    setSalvando(true);
    try {
      await criarEvento(validacao.data);
      await aoSalvar();
      aoFechar();
    } catch (falha) {
      setErro(falha instanceof ApiError ? falha.message : 'Nao foi possivel salvar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialogo
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={evento ? 'Editar evento' : 'Novo evento'}
      descricao="Data, local, recorrencia e lembrete."
      larguraMaxima="max-w-xl"
    >
      {carregandoDetalhe ? (
        <p className="text-sm text-[var(--texto-suave)]">Carregando...</p>
      ) : (
        <form onSubmit={enviar} className="space-y-4" noValidate>
          {erro ? <Alert tipo="erro">{erro}</Alert> : null}

          <Input
            rotulo="Titulo"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Prova de Banco de Dados"
            autoComplete="off"
            maxLength={200}
          />

          <Textarea
            rotulo="Descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Detalhes opcionais"
            maxLength={4000}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              rotulo="Local"
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              placeholder="Sala 204"
              maxLength={200}
            />
            <Input
              rotulo="Link"
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://..."
              maxLength={500}
            />
          </div>

          <SeletorDeCor valor={cor} aoEscolher={setCor} />

          <Interruptor
            rotulo="Dia inteiro"
            ligado={diaInteiro}
            aoAlternar={(ligado) => {
              setDiaInteiro(ligado);
              if (ligado) setInicio(`${inicio.slice(0, 10)}T00:00`);
            }}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              rotulo="Inicio"
              type={diaInteiro ? 'date' : 'datetime-local'}
              value={diaInteiro ? inicio.slice(0, 10) : inicio}
              onChange={(e) => setInicio(diaInteiro ? `${e.target.value}T00:00` : e.target.value)}
            />
            {!diaInteiro ? (
              <Input
                rotulo="Fim"
                type="datetime-local"
                value={fim}
                onChange={(e) => setFim(e.target.value)}
              />
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="recorrencia" className="block text-sm font-medium">
                Recorrencia
              </label>
              <select
                id="recorrencia"
                value={recorrenciaFreq}
                onChange={(e) => setRecorrenciaFreq(e.target.value as RecurrenceFrequency)}
                className="h-10 w-full rounded-md border bg-[var(--superficie)] px-3 text-sm transition-colors focus:border-[var(--destaque)]"
              >
                {RECURRENCE_FREQUENCIES.map((freq) => (
                  <option key={freq} value={freq}>
                    {NOMES_DE_RECORRENCIA[freq]}
                  </option>
                ))}
              </select>
            </div>

            {recorrenciaFreq !== 'none' ? (
              <Input
                rotulo="Repetir ate (opcional)"
                type="date"
                value={recorrenciaAte}
                onChange={(e) => setRecorrenciaAte(e.target.value)}
              />
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="lembrete" className="block text-sm font-medium">
              Lembrete por e-mail
            </label>
            <select
              id="lembrete"
              value={lembrete}
              onChange={(e) => setLembrete(e.target.value)}
              className="h-10 w-full rounded-md border bg-[var(--superficie)] px-3 text-sm transition-colors focus:border-[var(--destaque)]"
            >
              {OPCOES_DE_LEMBRETE.map((opcao) => (
                <option key={opcao.rotulo} value={opcao.valor ?? ''}>
                  {opcao.rotulo}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            {evento ? (
              <Button
                type="button"
                variante="discreto"
                tamanho="sm"
                onClick={() => setExcluindo(true)}
                className="text-perigo-500"
              >
                <Trash2 aria-hidden="true" className="size-3.5" />
                Mover para a lixeira
              </Button>
            ) : (
              <span />
            )}

            <div className="flex gap-2">
              <Button type="button" variante="secundario" onClick={aoFechar}>
                Fechar
              </Button>
              <Button type="submit" carregando={salvando}>
                {evento ? 'Salvar' : 'Criar evento'}
              </Button>
            </div>
          </div>
        </form>
      )}

      {evento ? (
        <DialogoDeConfirmacao
          aberto={excluindo}
          aoFechar={() => setExcluindo(false)}
          titulo={`Mover "${evento.title}" para a lixeira?`}
          descricao="Voce pode restaurar o evento depois, pela Lixeira."
          rotuloDeConfirmacao="Mover para a lixeira"
          aoConfirmar={async () => {
            await excluirEvento(evento.id);
            await aoSalvar();
            aoFechar();
          }}
        />
      ) : null}
    </Dialogo>
  );
}
