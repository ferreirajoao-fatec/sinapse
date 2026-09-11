'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type EstadoDoSalvamento = 'ocioso' | 'pendente' | 'salvando' | 'salvo' | 'erro';

/**
 * Salvamento automatico com espera e garantia de gravacao ao sair.
 *
 * Tres cuidados que a versao ingenua deste hook nao tem:
 *
 * 1. A ultima alteracao nunca se perde. Fechar a aba ou trocar de pagina
 *    dispara a gravacao pendente antes de sair.
 * 2. Nao ha duas gravacoes ao mesmo tempo. Se uma nova alteracao chega
 *    enquanto a anterior esta em transito, ela e enfileirada e enviada depois.
 * 3. O estado "salvo" volta para ocioso sozinho, para o indicador nao ficar
 *    dizendo "Salvo" por horas.
 */
export function usarAutosave<T>({
  aoSalvar,
  espera = 900,
}: {
  aoSalvar: (valor: T) => Promise<void>;
  espera?: number;
}) {
  const [estado, setEstado] = useState<EstadoDoSalvamento>('ocioso');

  const pendente = useRef<T | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const salvandoAgora = useRef(false);
  const salvarRef = useRef(aoSalvar);

  useEffect(() => {
    salvarRef.current = aoSalvar;
  }, [aoSalvar]);

  const gravar = useCallback(async () => {
    if (salvandoAgora.current || pendente.current === null) return;

    const valor = pendente.current;
    pendente.current = null;
    salvandoAgora.current = true;
    setEstado('salvando');

    try {
      await salvarRef.current(valor);
      setEstado(pendente.current === null ? 'salvo' : 'pendente');
    } catch {
      // Devolve o valor a fila: a proxima tentativa reenvia.
      pendente.current = valor;
      setEstado('erro');
    } finally {
      salvandoAgora.current = false;

      // Alteracoes que chegaram durante a gravacao seguem agora.
      if (pendente.current !== null) {
        void gravar();
      }
    }
  }, []);

  const agendar = useCallback(
    (valor: T) => {
      pendente.current = valor;
      setEstado('pendente');

      if (temporizador.current) clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => void gravar(), espera);
    },
    [gravar, espera],
  );

  /** Grava na hora, sem esperar. Usado pelo Ctrl+S e ao sair da pagina. */
  const gravarAgora = useCallback(async () => {
    if (temporizador.current) clearTimeout(temporizador.current);
    await gravar();
  }, [gravar]);

  // "Salvo" some sozinho depois de alguns segundos.
  useEffect(() => {
    if (estado !== 'salvo') return;

    const relogio = setTimeout(() => setEstado('ocioso'), 2500);
    return () => clearTimeout(relogio);
  }, [estado]);

  // Fechar a aba com alteracao pendente pede confirmacao ao navegador.
  useEffect(() => {
    function aoSair(evento: BeforeUnloadEvent) {
      if (pendente.current !== null) {
        void gravar();
        evento.preventDefault();
        evento.returnValue = '';
      }
    }

    window.addEventListener('beforeunload', aoSair);
    return () => window.removeEventListener('beforeunload', aoSair);
  }, [gravar]);

  // Trocar de pagina dentro do sistema tambem grava o que estava pendente.
  useEffect(() => {
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
      if (pendente.current !== null) void gravar();
    };
  }, [gravar]);

  return { estado, agendar, gravarAgora, temPendencia: () => pendente.current !== null };
}
