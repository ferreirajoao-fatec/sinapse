'use client';

import { useEffect, useRef, useState } from 'react';
import type { EstadoDoSalvamento } from '@/components/editor/indicador-de-salvamento';
import type { EstadoDaColaboracao } from './usar-colaboracao';

/**
 * Traduz a conexao para o indicador: alteracoes ainda nao confirmadas pelo
 * servidor aparecem como "Salvando", e o "Salvo" some sozinho depois de um
 * tempo para nao virar ruido.
 */
export function usarEstadoDoSalvamento(
  conexao: EstadoDaColaboracao,
  pendentes: number,
): EstadoDoSalvamento {
  const [recemSalvo, setRecemSalvo] = useState(false);
  const tinhaPendentes = useRef(false);

  useEffect(() => {
    if (pendentes > 0) {
      tinhaPendentes.current = true;
      setRecemSalvo(false);
      return;
    }

    if (!tinhaPendentes.current) return;

    tinhaPendentes.current = false;
    setRecemSalvo(true);
    const temporizador = setTimeout(() => setRecemSalvo(false), 2500);
    return () => clearTimeout(temporizador);
  }, [pendentes]);

  if (conexao === 'desconectado') return 'offline';
  if (pendentes > 0) return 'salvando';
  return recemSalvo ? 'salvo' : 'ocioso';
}
