'use client';

import type { GrupoNaArvore } from '@sinapse/shared';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usarUsuario } from '@/hooks/usar-usuario';
import { buscarArvore } from '@/lib/conteudos';

const CHAVE_ABERTOS = 'sinapse:itens-abertos';

interface ContextoDaArvore {
  grupos: GrupoNaArvore[];
  carregando: boolean;
  erro: string | null;
  recarregar: () => Promise<void>;
  /** Substitui a arvore na hora, sem esperar o servidor. */
  definirGrupos: (grupos: GrupoNaArvore[]) => void;
  abertos: Set<string>;
  alternarAberto: (id: string) => void;
  abrirCaminho: (ids: string[]) => void;
}

const Contexto = createContext<ContextoDaArvore | null>(null);

function gravarAbertos(ids: Set<string>): void {
  try {
    window.localStorage.setItem(CHAVE_ABERTOS, JSON.stringify([...ids]));
  } catch {
    // Sem espaco no navegador: perder a expansao e aceitavel.
  }
}

/**
 * Arvore de conteudos, carregada uma vez e compartilhada.
 *
 * A barra lateral, a tela de anotacoes e os menus de mover leem daqui, entao
 * criar um grupo em qualquer lugar aparece imediatamente em todos os outros.
 */
export function ProvedorDaArvore({ children }: { children: ReactNode }) {
  const { usuario } = usarUsuario();
  const [grupos, setGrupos] = useState<GrupoNaArvore[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [abertos, setAbertos] = useState<Set<string>>(new Set());

  // Quais nos estao expandidos e preferencia do aparelho, nao da conta.
  useEffect(() => {
    try {
      const salvos = window.localStorage.getItem(CHAVE_ABERTOS);
      if (salvos) setAbertos(new Set(JSON.parse(salvos) as string[]));
    } catch {
      // Um valor corrompido nao pode impedir a tela de abrir.
    }
  }, []);

  const recarregar = useCallback(async () => {
    if (!usuario) return;

    try {
      setErro(null);
      setGrupos(await buscarArvore());
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Nao foi possivel carregar seus conteudos.');
    } finally {
      setCarregando(false);
    }
  }, [usuario]);

  useEffect(() => {
    if (usuario) {
      void recarregar();
    } else {
      setGrupos([]);
      setCarregando(false);
    }
  }, [usuario, recarregar]);

  const alternarAberto = useCallback((id: string) => {
    setAbertos((atuais) => {
      const proximos = new Set(atuais);
      if (proximos.has(id)) {
        proximos.delete(id);
      } else {
        proximos.add(id);
      }
      gravarAbertos(proximos);
      return proximos;
    });
  }, []);

  /** Abre um caminho inteiro de uma vez, ao entrar direto numa pagina por URL. */
  const abrirCaminho = useCallback((ids: string[]) => {
    setAbertos((atuais) => {
      const proximos = new Set(atuais);
      let mudou = false;

      for (const id of ids) {
        if (!proximos.has(id)) {
          proximos.add(id);
          mudou = true;
        }
      }

      if (!mudou) return atuais;

      gravarAbertos(proximos);
      return proximos;
    });
  }, []);

  const valor = useMemo<ContextoDaArvore>(
    () => ({
      grupos,
      carregando,
      erro,
      recarregar,
      definirGrupos: setGrupos,
      abertos,
      alternarAberto,
      abrirCaminho,
    }),
    [grupos, carregando, erro, recarregar, abertos, alternarAberto, abrirCaminho],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function usarArvore(): ContextoDaArvore {
  const contexto = useContext(Contexto);

  if (!contexto) {
    throw new Error('usarArvore precisa estar dentro de ProvedorDaArvore');
  }

  return contexto;
}
