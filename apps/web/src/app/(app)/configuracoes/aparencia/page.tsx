'use client';

import type { Theme } from '@sinapse/shared';
import { Keyboard, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Interruptor } from '@/components/ui/interruptor';
import { usarNavegacao } from '@/hooks/usar-navegacao';
import { usarPreferencias } from '@/hooks/usar-preferencias';
import { cn } from '@/lib/utils';

const TEMAS: { valor: Theme; rotulo: string; descricao: string; Icone: LucideIcon }[] = [
  { valor: 'light', rotulo: 'Claro', descricao: 'Fundo claro o tempo todo', Icone: Sun },
  { valor: 'dark', rotulo: 'Escuro', descricao: 'Fundo escuro o tempo todo', Icone: Moon },
  {
    valor: 'system',
    rotulo: 'Sistema',
    descricao: 'Acompanha a configuracao do aparelho',
    Icone: Monitor,
  },
];

const ESCALAS = [90, 100, 110, 125, 150];

export default function PaginaDeAparencia() {
  const {
    tema,
    escala,
    movimentoReduzido,
    definirTema,
    definirEscala,
    definirMovimentoReduzido,
  } = usarPreferencias();

  const { abrirAjuda } = usarNavegacao();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-serif text-3xl tracking-tight">Aparencia</h1>
        <p className="text-sm text-[var(--texto-suave)]">
          Estas escolhas ficam salvas na sua conta e acompanham voce em qualquer aparelho.
        </p>
      </div>

      <Card>
        <CardHeader titulo="Tema" descricao="Como o sistema se apresenta" />
        <CardContent>
          <div
            role="radiogroup"
            aria-label="Tema"
            className="grid gap-3 sm:grid-cols-3"
          >
            {TEMAS.map(({ valor, rotulo, descricao, Icone }) => {
              const ativo = tema === valor;

              return (
                <button
                  key={valor}
                  type="button"
                  role="radio"
                  aria-checked={ativo}
                  onClick={() => void definirTema(valor)}
                  className={cn(
                    'flex cursor-pointer flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors',
                    ativo
                      ? 'border-[var(--destaque)] bg-[var(--destaque-suave)]'
                      : 'hover:border-[var(--borda-forte)]',
                  )}
                >
                  <Icone
                    aria-hidden="true"
                    className={cn(
                      'size-4',
                      ativo ? 'text-[var(--destaque)]' : 'text-[var(--texto-suave)]',
                    )}
                  />
                  <span className="text-sm font-medium">{rotulo}</span>
                  <span className="text-xs text-[var(--texto-suave)]">{descricao}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          titulo="Tamanho do texto"
          descricao="Aumenta ou reduz todo o sistema, nao apenas o corpo do texto"
        />
        <CardContent className="space-y-4">
          <div role="radiogroup" aria-label="Tamanho do texto" className="flex flex-wrap gap-2">
            {ESCALAS.map((valor) => {
              const ativo = escala === valor;

              return (
                <button
                  key={valor}
                  type="button"
                  role="radio"
                  aria-checked={ativo}
                  onClick={() => void definirEscala(valor)}
                  className={cn(
                    'h-9 cursor-pointer rounded-md border px-4 text-sm transition-colors',
                    ativo
                      ? 'border-[var(--destaque)] bg-[var(--destaque-suave)] font-medium text-[var(--destaque)]'
                      : 'text-[var(--texto-suave)] hover:border-[var(--borda-forte)] hover:text-[var(--texto)]',
                  )}
                >
                  {valor}%
                </button>
              );
            })}
          </div>

          <p className="rounded-md border bg-[var(--superficie-suave)] px-4 py-3 text-sm text-[var(--texto-suave)]">
            Um exemplo de texto corrido no tamanho escolhido. A normalizacao elimina dependencias
            transitivas entre atributos que nao fazem parte da chave.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader titulo="Acessibilidade" descricao="Ajustes de conforto de leitura" />
        <CardContent className="space-y-5">
          <Interruptor
            rotulo="Reduzir animacoes"
            descricao="Desliga transicoes e movimentos. Tambem respeitamos essa preferencia quando ela ja esta ligada no seu sistema."
            ligado={movimentoReduzido}
            aoAlternar={(valor) => void definirMovimentoReduzido(valor)}
          />

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Atalhos de teclado</p>
              <p className="text-xs text-[var(--texto-suave)]">
                Todo o sistema pode ser usado sem o mouse.
              </p>
            </div>

            <Button variante="secundario" tamanho="sm" onClick={abrirAjuda}>
              <Keyboard aria-hidden="true" className="size-4" />
              Ver atalhos
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
