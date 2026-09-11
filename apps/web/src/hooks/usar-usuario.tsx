'use client';

import type { UsuarioPublico } from '@sinapse/shared';
import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { buscarSessao, sair as sairDaApi } from '@/lib/auth';

interface ContextoDeUsuario {
  usuario: UsuarioPublico | null;
  carregando: boolean;
  recarregar: () => Promise<void>;
  definirUsuario: (usuario: UsuarioPublico) => void;
  sair: () => Promise<void>;
}

const Contexto = createContext<ContextoDeUsuario | null>(null);

export function ProvedorDeUsuario({
  children,
  usuarioInicial = null,
}: {
  children: ReactNode;
  usuarioInicial?: UsuarioPublico | null;
}) {
  const [usuario, setUsuario] = useState<UsuarioPublico | null>(usuarioInicial);
  const [carregando, setCarregando] = useState(usuarioInicial === null);
  const router = useRouter();

  const recarregar = useCallback(async () => {
    try {
      setUsuario(await buscarSessao());
    } catch {
      setUsuario(null);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (usuarioInicial === null) {
      void recarregar();
    }
  }, [recarregar, usuarioInicial]);

  const sair = useCallback(async () => {
    try {
      await sairDaApi();
    } finally {
      setUsuario(null);
      router.replace('/login');
      router.refresh();
    }
  }, [router]);

  const valor = useMemo<ContextoDeUsuario>(
    () => ({ usuario, carregando, recarregar, definirUsuario: setUsuario, sair }),
    [usuario, carregando, recarregar, sair],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function usarUsuario(): ContextoDeUsuario {
  const contexto = useContext(Contexto);

  if (!contexto) {
    throw new Error('usarUsuario precisa estar dentro de ProvedorDeUsuario');
  }

  return contexto;
}
