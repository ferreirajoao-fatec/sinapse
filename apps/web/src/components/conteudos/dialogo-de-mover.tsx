'use client';

import type { PaginaCompleta } from '@sinapse/shared';
import { ChevronRight, FolderOpen } from 'lucide-react';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialogo } from '@/components/ui/dialogo';
import { usarArvore } from '@/hooks/usar-arvore';
import { ApiError } from '@/lib/api';
import { moverPagina } from '@/lib/conteudos';
import { corDeConteudo, iconeDeConteudo } from '@/lib/icones-de-conteudo';
import { cn } from '@/lib/utils';

/**
 * Escolha da secao de destino ao mover uma pagina.
 *
 * Mostrar a arvore inteira deixa claro para onde a pagina vai, o que uma lista
 * plana de secoes com nomes repetidos ("Aula 1" em dois grupos) nao consegue.
 */
export function DialogoDeMover({
  aberto,
  aoFechar,
  pagina,
  aoMover,
}: {
  aberto: boolean;
  aoFechar: () => void;
  pagina: PaginaCompleta;
  aoMover: (atualizada: PaginaCompleta) => void;
}) {
  const { grupos, recarregar } = usarArvore();
  const [destino, setDestino] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [movendo, setMovendo] = useState(false);

  async function confirmar() {
    if (!destino) return;

    setErro(null);
    setMovendo(true);

    try {
      // A pagina vira raiz na secao de destino: manter a pagina superior
      // exigiria que ela tambem estivesse la.
      const atualizada = await moverPagina(pagina.id, { sectionId: destino, parentPageId: null });
      await recarregar();
      aoMover(atualizada);
      aoFechar();
    } catch (falha) {
      setErro(falha instanceof ApiError ? falha.message : 'Nao foi possivel mover.');
    } finally {
      setMovendo(false);
    }
  }

  return (
    <Dialogo
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Mover pagina"
      descricao={`Escolha para onde levar "${pagina.title}".`}
    >
      <div className="space-y-4">
        {erro ? <Alert tipo="erro">{erro}</Alert> : null}

        {pagina.parentPageId ? (
          <Alert tipo="informacao">
            Esta e uma subpagina. Ao mover, ela passa a ser uma pagina principal da secao escolhida.
          </Alert>
        ) : null}

        <div
          role="radiogroup"
          aria-label="Secao de destino"
          className="max-h-72 space-y-2 overflow-y-auto rounded-md border p-2"
        >
          {grupos.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-[var(--texto-suave)]">
              Voce ainda nao tem outros grupos.
            </p>
          ) : (
            grupos.map((grupo) => {
              const IconeGrupo = iconeDeConteudo(grupo.icon, FolderOpen);

              return (
                <div key={grupo.id} className="space-y-0.5">
                  <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-[var(--texto-suave)]">
                    <span
                      className={cn('size-2 rounded-full', corDeConteudo(grupo.color).ponto)}
                      aria-hidden="true"
                    />
                    <IconeGrupo aria-hidden="true" className="size-3.5" />
                    {grupo.name}
                  </div>

                  {grupo.secoes.length === 0 ? (
                    <p className="px-2 pb-1 pl-8 text-xs text-[var(--texto-tenue)]">
                      Sem secoes
                    </p>
                  ) : (
                    grupo.secoes.map((secao) => {
                      const atual = secao.id === pagina.sectionId;
                      const escolhida = destino === secao.id;

                      return (
                        <button
                          key={secao.id}
                          type="button"
                          role="radio"
                          aria-checked={escolhida}
                          disabled={atual}
                          onClick={() => setDestino(secao.id)}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-md py-1.5 pr-2 pl-6 text-left text-sm transition-colors',
                            atual
                              ? 'cursor-not-allowed text-[var(--texto-tenue)]'
                              : 'cursor-pointer hover:bg-[var(--superficie-suave)]',
                            escolhida && 'bg-[var(--destaque-suave)] text-[var(--destaque)]',
                          )}
                        >
                          <ChevronRight aria-hidden="true" className="size-3 opacity-50" />
                          <span className="flex-1 truncate">{secao.name}</span>
                          {atual ? (
                            <span className="text-2xs text-[var(--texto-tenue)]">esta aqui</span>
                          ) : null}
                        </button>
                      );
                    })
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variante="secundario" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button disabled={!destino} carregando={movendo} onClick={() => void confirmar()}>
            Mover para aqui
          </Button>
        </div>
      </div>
    </Dialogo>
  );
}
