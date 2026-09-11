'use client';

import { usePathname } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const CHAVE_BARRA = 'sinapse:barra-lateral-recolhida';

interface ContextoDeNavegacao {
  /** Barra lateral estreita, so com icones (computador). */
  recolhida: boolean;
  alternarRecolhida: () => void;
  /** Gaveta lateral aberta sobre o conteudo (celular e tablet). */
  gavetaAberta: boolean;
  abrirGaveta: () => void;
  fecharGaveta: () => void;
  /** Paleta de comandos. */
  paletaAberta: boolean;
  abrirPaleta: () => void;
  fecharPaleta: () => void;
  /** Tela de atalhos de teclado. */
  ajudaAberta: boolean;
  abrirAjuda: () => void;
  fecharAjuda: () => void;
}

const Contexto = createContext<ContextoDeNavegacao | null>(null);

export function ProvedorDeNavegacao({ children }: { children: ReactNode }) {
  const [recolhida, setRecolhida] = useState(false);
  const [gavetaAberta, setGavetaAberta] = useState(false);
  const [paletaAberta, setPaletaAberta] = useState(false);
  const [ajudaAberta, setAjudaAberta] = useState(false);
  const caminho = usePathname();

  // A preferencia de barra recolhida e do dispositivo, nao da conta:
  // uma tela pequena pede barra estreita mesmo para quem prefere larga.
  useEffect(() => {
    setRecolhida(window.localStorage.getItem(CHAVE_BARRA) === 'true');
  }, []);

  // Navegar fecha a gaveta, senao o menu ficaria por cima da pagina nova.
  useEffect(() => {
    setGavetaAberta(false);
  }, [caminho]);

  // Enquanto a gaveta esta aberta, o conteudo atras nao deve rolar.
  useEffect(() => {
    document.body.style.overflow = gavetaAberta ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [gavetaAberta]);

  const alternarRecolhida = useCallback(() => {
    setRecolhida((atual) => {
      const proxima = !atual;
      window.localStorage.setItem(CHAVE_BARRA, String(proxima));
      return proxima;
    });
  }, []);

  const valor = useMemo<ContextoDeNavegacao>(
    () => ({
      recolhida,
      alternarRecolhida,
      gavetaAberta,
      abrirGaveta: () => setGavetaAberta(true),
      fecharGaveta: () => setGavetaAberta(false),
      paletaAberta,
      abrirPaleta: () => setPaletaAberta(true),
      fecharPaleta: () => setPaletaAberta(false),
      ajudaAberta,
      abrirAjuda: () => setAjudaAberta(true),
      fecharAjuda: () => setAjudaAberta(false),
    }),
    [recolhida, alternarRecolhida, gavetaAberta, paletaAberta, ajudaAberta],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function usarNavegacao(): ContextoDeNavegacao {
  const contexto = useContext(Contexto);

  if (!contexto) {
    throw new Error('usarNavegacao precisa estar dentro de ProvedorDeNavegacao');
  }

  return contexto;
}
