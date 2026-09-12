'use client';

import { LogOut, Moon, Search, Sun, type LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialogo } from '@/components/ui/dialogo';
import { usarNavegacao } from '@/hooks/usar-navegacao';
import { usarPreferencias } from '@/hooks/usar-preferencias';
import { usarUsuario } from '@/hooks/usar-usuario';
import { NAVEGACAO_CONFIGURACOES, NAVEGACAO_PRINCIPAL, NAVEGACAO_SECUNDARIA } from '@/lib/rotas';
import { cn } from '@/lib/utils';

interface Comando {
  id: string;
  rotulo: string;
  grupo: string;
  Icone: LucideIcon;
  detalhe?: string;
  executar: () => void;
}

/** Remove acentos para que "calendario" encontre "Calendário" e vice-versa. */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Paleta de comandos, aberta com Ctrl+K.
 *
 * Hoje ela navega e executa acoes. A partir da Etapa 6 a mesma janela passa a
 * buscar tambem dentro das anotacoes, arquivos e tarefas, sem mudar de lugar.
 */
export function PaletaDeComandos() {
  const { paletaAberta, fecharPaleta, abrirAjuda } = usarNavegacao();
  const { alternarClaroEscuro, temaResolvido } = usarPreferencias();
  const { sair } = usarUsuario();
  const router = useRouter();

  const [busca, setBusca] = useState('');
  const [selecionado, setSelecionado] = useState(0);
  const lista = useRef<HTMLUListElement>(null);

  const comandos = useMemo<Comando[]>(() => {
    const navegacao: Comando[] = [
      ...NAVEGACAO_PRINCIPAL,
      ...NAVEGACAO_SECUNDARIA,
      ...NAVEGACAO_CONFIGURACOES,
    ].map((item) => ({
      id: `ir-${item.href}`,
      rotulo: `Ir para ${item.rotulo}`,
      grupo: 'Navegacao',
      Icone: item.Icone,
      detalhe: item.etapa,
      executar: () => router.push(item.href),
    }));

    const acoes: Comando[] = [
      {
        id: 'tema',
        rotulo: temaResolvido === 'dark' ? 'Mudar para o modo claro' : 'Mudar para o modo escuro',
        grupo: 'Acoes',
        Icone: temaResolvido === 'dark' ? Sun : Moon,
        executar: alternarClaroEscuro,
      },
      {
        id: 'atalhos',
        rotulo: 'Ver os atalhos de teclado',
        grupo: 'Acoes',
        Icone: Search,
        executar: abrirAjuda,
      },
      {
        id: 'sair',
        rotulo: 'Sair da conta',
        grupo: 'Acoes',
        Icone: LogOut,
        executar: () => void sair(),
      },
    ];

    return [...navegacao, ...acoes];
  }, [router, temaResolvido, alternarClaroEscuro, abrirAjuda, sair]);

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    if (!termo) return comandos;

    return comandos.filter((comando) => normalizar(comando.rotulo).includes(termo));
  }, [busca, comandos]);

  useEffect(() => {
    setSelecionado(0);
  }, [busca]);

  useEffect(() => {
    if (!paletaAberta) {
      setBusca('');
      setSelecionado(0);
    }
  }, [paletaAberta]);

  // Mantem o item destacado visivel enquanto se navega pelo teclado.
  useEffect(() => {
    lista.current?.children[selecionado]?.scrollIntoView({ block: 'nearest' });
  }, [selecionado]);

  function executar(comando: Comando) {
    fecharPaleta();
    comando.executar();
  }

  function aoPressionar(evento: React.KeyboardEvent) {
    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      setSelecionado((atual) => (atual + 1) % Math.max(filtrados.length, 1));
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      setSelecionado((atual) => (atual - 1 + filtrados.length) % Math.max(filtrados.length, 1));
    } else if (evento.key === 'Enter') {
      evento.preventDefault();
      const escolhido = filtrados[selecionado];
      if (escolhido) executar(escolhido);
    }
  }

  let grupoAnterior = '';

  return (
    <Dialogo
      aberto={paletaAberta}
      aoFechar={fecharPaleta}
      titulo="Buscar comandos"
      larguraMaxima="max-w-xl"
      semPadding
    >
      <div className="pt-2">
        <div className="flex items-center gap-2.5 border-b px-1 pb-3">
          <Search aria-hidden="true" className="size-4 shrink-0 text-[var(--texto-tenue)]" />
          <input
            autoFocus
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="lista-de-comandos"
            aria-label="Buscar comandos"
            placeholder="Buscar paginas e acoes..."
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            onKeyDown={aoPressionar}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--texto-tenue)]"
          />
        </div>

        {filtrados.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[var(--texto-suave)]">
            Nada encontrado para <span className="font-medium text-[var(--texto)]">{busca}</span>. A
            busca dentro das anotacoes chega na Etapa 6.
          </p>
        ) : (
          <ul
            ref={lista}
            id="lista-de-comandos"
            role="listbox"
            aria-label="Comandos"
            className="max-h-80 overflow-y-auto py-2"
          >
            {filtrados.map((comando, indice) => {
              const novoGrupo = comando.grupo !== grupoAnterior;
              grupoAnterior = comando.grupo;

              return (
                <li key={comando.id}>
                  {novoGrupo ? (
                    <p className="text-2xs px-3 pb-1 pt-3 font-medium uppercase tracking-wide text-[var(--texto-tenue)]">
                      {comando.grupo}
                    </p>
                  ) : null}

                  <button
                    type="button"
                    role="option"
                    aria-selected={indice === selecionado}
                    onClick={() => executar(comando)}
                    onMouseEnter={() => setSelecionado(indice)}
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors',
                      indice === selecionado
                        ? 'bg-[var(--superficie-suave)] text-[var(--texto)]'
                        : 'text-[var(--texto-suave)]',
                    )}
                  >
                    <comando.Icone aria-hidden="true" className="size-4 shrink-0" />
                    <span className="flex-1 truncate">{comando.rotulo}</span>
                    {comando.detalhe ? (
                      <span className="text-2xs text-[var(--texto-tenue)]">{comando.detalhe}</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="text-2xs flex items-center gap-4 border-t px-3 py-2 text-[var(--texto-tenue)]">
          <span className="flex items-center gap-1">
            <kbd className="rounded-sm border px-1 font-mono">↑</kbd>
            <kbd className="rounded-sm border px-1 font-mono">↓</kbd>
            navegar
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded-sm border px-1 font-mono">Enter</kbd>
            abrir
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded-sm border px-1 font-mono">Esc</kbd>
            fechar
          </span>
        </div>
      </div>
    </Dialogo>
  );
}
