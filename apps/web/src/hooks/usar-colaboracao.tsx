'use client';

import { HocuspocusProvider, WebSocketStatus } from '@hocuspocus/provider';
import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { ticketDeColaboracao, urlDaColaboracao } from '@/lib/colaboracao';

export type EstadoDaColaboracao = 'conectando' | 'sincronizado' | 'desconectado' | 'sem-acesso';

export interface PessoaPresente {
  clientId: number;
  nome: string;
  cor: string;
}

export interface SessaoDeColaboracao {
  ydoc: Y.Doc;
  provider: HocuspocusProvider;
}

/**
 * Conexao de edicao em tempo real de uma pagina.
 *
 * O provider reconecta sozinho quando a rede cai ou quando o servidor derruba
 * a conexao (troca de permissao, deploy). Cada tentativa pede um ticket novo,
 * entao a permissao usada e sempre a atual.
 */
export function usarColaboracao(paginaId: string) {
  const [sessao, setSessao] = useState<SessaoDeColaboracao | null>(null);
  const [estado, setEstado] = useState<EstadoDaColaboracao>('conectando');
  const [pendentes, setPendentes] = useState(0);
  const [somenteLeitura, setSomenteLeitura] = useState(false);
  const [presentes, setPresentes] = useState<PessoaPresente[]>([]);

  useEffect(() => {
    const ydoc = new Y.Doc();

    setEstado('conectando');
    setPendentes(0);
    setPresentes([]);

    const provider = new HocuspocusProvider({
      url: urlDaColaboracao(),
      name: `pagina:${paginaId}`,
      document: ydoc,
      token: async () => {
        try {
          return (await ticketDeColaboracao(paginaId)).token;
        } catch {
          // Sem ticket (acesso removido, sessao expirada): o servidor recusa
          // e o estado vira "sem-acesso".
          return '';
        }
      },
      onAuthenticated: () => setSomenteLeitura(provider.authorizedScope === 'readonly'),
      onAuthenticationFailed: () => setEstado('sem-acesso'),
      onSynced: ({ state }) => {
        if (state) setEstado('sincronizado');
      },
      onStatus: ({ status }) => {
        if (status === WebSocketStatus.Disconnected) {
          setEstado((atual) => (atual === 'sem-acesso' ? atual : 'desconectado'));
        }
      },
      onAwarenessChange: ({ states }) => {
        setPresentes(
          states
            .filter((dados) => dados.clientId !== provider.awareness?.clientID)
            .map((dados) => {
              const usuario = (dados as { user?: { name?: string; color?: string } }).user;
              return {
                clientId: dados.clientId,
                nome: usuario?.name ?? 'Alguem',
                cor: usuario?.color ?? '#78776f',
              };
            }),
        );
      },
    });

    provider.on('unsyncedChanges', (quantidade: number) => setPendentes(quantidade));

    setSessao({ ydoc, provider });

    return () => {
      provider.destroy();
      ydoc.destroy();
      setSessao(null);
    };
  }, [paginaId]);

  return { sessao, estado, pendentes, somenteLeitura, presentes };
}
