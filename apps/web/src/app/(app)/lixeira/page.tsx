'use client';

import type { ItemDaLixeira, TipoNaLixeira } from '@sinapse/shared';
import { FileText, FolderOpen, ListChecks, RotateCcw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { DialogoDeConfirmacao } from '@/components/conteudos/dialogo-de-confirmacao';
import { Trilha } from '@/components/navegacao/trilha';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import { Skeleton } from '@/components/ui/skeleton';
import { usarArvore } from '@/hooks/usar-arvore';
import { ApiError } from '@/lib/api';
import {
  esvaziarLixeira,
  excluirDefinitivamente,
  listarLixeira,
  restaurarDaLixeira,
} from '@/lib/conteudos';
import { iconeDeConteudo } from '@/lib/icones-de-conteudo';

const ROTULOS: Record<TipoNaLixeira, string> = {
  grupo: 'Grupo',
  secao: 'Secao',
  pagina: 'Pagina',
  coluna_de_tarefas: 'Coluna',
  tarefa: 'Tarefa',
};

function formatarData(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export default function PaginaDaLixeira() {
  const { recarregar } = usarArvore();
  const [itens, setItens] = useState<ItemDaLixeira[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmacao, setConfirmacao] = useState<
    { tipo: 'item'; item: ItemDaLixeira } | { tipo: 'tudo' } | null
  >(null);

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      setItens(await listarLixeira());
    } catch (falha) {
      setErro(falha instanceof ApiError ? falha.message : 'Nao foi possivel carregar a lixeira.');
      setItens([]);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function restaurar(item: ItemDaLixeira) {
    setErro(null);

    try {
      await restaurarDaLixeira(item.tipo, item.id);
      await Promise.all([carregar(), recarregar()]);
    } catch (falha) {
      setErro(falha instanceof ApiError ? falha.message : 'Nao foi possivel restaurar.');
    }
  }

  return (
    <div className="space-y-6">
      <Trilha />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-serif text-3xl tracking-tight">Lixeira</h1>
          <p className="text-sm text-[var(--texto-suave)]">
            Itens excluidos ficam aqui ate voce restaurar ou remover de vez.
          </p>
        </div>

        {itens && itens.length > 0 ? (
          <Button variante="secundario" onClick={() => setConfirmacao({ tipo: 'tudo' })}>
            <Trash2 aria-hidden="true" className="size-4" />
            Esvaziar lixeira
          </Button>
        ) : null}
      </div>

      {erro ? <Alert tipo="erro">{erro}</Alert> : null}

      {itens === null ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : itens.length === 0 ? (
        <Card>
          <EstadoVazio
            icone={<Trash2 className="size-5" />}
            titulo="A lixeira esta vazia"
            descricao="Quando voce excluir um grupo, uma secao ou uma pagina, o item aparece aqui e pode ser restaurado."
          />
        </Card>
      ) : (
        <ul className="space-y-2">
          {itens.map((item) => {
            const Icone = iconeDeConteudo(
              item.icone,
              item.tipo === 'pagina'
                ? FileText
                : item.tipo === 'tarefa' || item.tipo === 'coluna_de_tarefas'
                  ? ListChecks
                  : FolderOpen,
            );

            return (
              <li key={`${item.tipo}-${item.id}`}>
                <Card className="flex flex-wrap items-center gap-3 p-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[var(--superficie-suave)] text-[var(--texto-suave)]">
                    <Icone aria-hidden="true" className="size-4" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2">
                      <span className="truncate font-medium">{item.nome}</span>
                      <Badge>{ROTULOS[item.tipo]}</Badge>
                    </p>
                    <p className="truncate text-xs text-[var(--texto-suave)]">
                      {item.contexto ? `${item.contexto} - ` : ''}
                      excluido em {formatarData(item.excluidoEm)}
                      {item.filhos > 0
                        ? ` - leva ${item.filhos} ${item.filhos === 1 ? 'item' : 'itens'} junto`
                        : ''}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Button variante="secundario" tamanho="sm" onClick={() => void restaurar(item)}>
                      <RotateCcw aria-hidden="true" className="size-3.5" />
                      Restaurar
                    </Button>
                    <Button
                      variante="discreto"
                      tamanho="sm"
                      onClick={() => setConfirmacao({ tipo: 'item', item })}
                    >
                      Excluir
                    </Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {confirmacao?.tipo === 'item' ? (
        <DialogoDeConfirmacao
          aberto
          aoFechar={() => setConfirmacao(null)}
          titulo={`Excluir "${confirmacao.item.nome}" definitivamente?`}
          descricao="Esta acao nao pode ser desfeita."
          aviso={
            confirmacao.item.filhos > 0
              ? `Os ${confirmacao.item.filhos} itens dentro dele tambem serao apagados para sempre.`
              : undefined
          }
          rotuloDeConfirmacao="Excluir para sempre"
          aoConfirmar={async () => {
            await excluirDefinitivamente(confirmacao.item.tipo, confirmacao.item.id);
            await carregar();
          }}
        />
      ) : null}

      {confirmacao?.tipo === 'tudo' ? (
        <DialogoDeConfirmacao
          aberto
          aoFechar={() => setConfirmacao(null)}
          titulo="Esvaziar a lixeira?"
          descricao="Todos os itens listados serao apagados para sempre."
          aviso="Nao ha como desfazer. Restaure antes o que voce ainda quiser manter."
          rotuloDeConfirmacao="Esvaziar tudo"
          aoConfirmar={async () => {
            await esvaziarLixeira();
            await carregar();
          }}
        />
      ) : null}
    </div>
  );
}
