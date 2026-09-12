'use client';

import { criarEtiquetaSchema, type EtiquetaResumida } from '@sinapse/shared';
import { Plus, Tag, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { criarEtiqueta, listarEtiquetas } from '@/lib/conteudos';
import { corDeConteudo } from '@/lib/icones-de-conteudo';
import { cn } from '@/lib/utils';

/**
 * Escolha das etiquetas de uma pagina, com criacao rapida no proprio campo.
 * Digitar um nome que ainda nao existe oferece criar sem sair da tela.
 */
export function SeletorDeEtiquetas({
  selecionadas,
  aoAlterar,
}: {
  selecionadas: EtiquetaResumida[];
  aoAlterar: (etiquetas: EtiquetaResumida[]) => void;
}) {
  const [disponiveis, setDisponiveis] = useState<EtiquetaResumida[]>([]);
  const [busca, setBusca] = useState('');
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    void listarEtiquetas()
      .then(setDisponiveis)
      .catch(() => setDisponiveis([]));
  }, []);

  const termo = busca.trim().toLowerCase();
  const escolhidas = new Set(selecionadas.map((etiqueta) => etiqueta.id));

  const sugestoes = disponiveis.filter(
    (etiqueta) => !escolhidas.has(etiqueta.id) && etiqueta.name.includes(termo),
  );

  const podeCriar = termo.length > 0 && !disponiveis.some((etiqueta) => etiqueta.name === termo);

  async function criarEAplicar() {
    setErro(null);

    const validacao = criarEtiquetaSchema.safeParse({ name: busca, color: 'slate' });

    if (!validacao.success) {
      setErro(validacao.error.issues[0]?.message ?? 'Nome invalido');
      return;
    }

    setCriando(true);

    try {
      const nova = await criarEtiqueta(validacao.data);
      setDisponiveis((atuais) => [...atuais, nova].sort((a, b) => a.name.localeCompare(b.name)));
      aoAlterar([...selecionadas, nova]);
      setBusca('');
    } catch (falha) {
      setErro(falha instanceof ApiError ? falha.message : 'Nao foi possivel criar a etiqueta.');
    } finally {
      setCriando(false);
    }
  }

  return (
    <div className="space-y-3">
      {selecionadas.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {selecionadas.map((etiqueta) => (
            <li key={etiqueta.id}>
              <span
                className={cn(
                  'text-2xs inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium',
                  corDeConteudo(etiqueta.color).fundo,
                  corDeConteudo(etiqueta.color).texto,
                )}
              >
                {etiqueta.name}
                <button
                  type="button"
                  aria-label={`Remover ${etiqueta.name}`}
                  onClick={() => aoAlterar(selecionadas.filter((item) => item.id !== etiqueta.id))}
                  className="cursor-pointer opacity-60 transition-opacity hover:opacity-100"
                >
                  <X aria-hidden="true" className="size-3" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center gap-2 rounded-md border px-3">
          <Tag aria-hidden="true" className="size-3.5 shrink-0 text-[var(--texto-tenue)]" />
          <input
            type="text"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Buscar ou criar etiqueta"
            aria-label="Buscar ou criar etiqueta"
            maxLength={40}
            className="h-9 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--texto-tenue)]"
          />
        </div>

        {erro ? (
          <p role="alert" className="text-perigo-700 dark:text-perigo-500 text-xs">
            {erro}
          </p>
        ) : null}

        {sugestoes.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {sugestoes.slice(0, 12).map((etiqueta) => (
              <li key={etiqueta.id}>
                <button
                  type="button"
                  onClick={() => {
                    aoAlterar([...selecionadas, etiqueta]);
                    setBusca('');
                  }}
                  className="text-2xs inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-0.5 transition-colors hover:bg-[var(--superficie-suave)]"
                >
                  <span
                    className={cn('size-2 rounded-full', corDeConteudo(etiqueta.color).ponto)}
                    aria-hidden="true"
                  />
                  {etiqueta.name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {podeCriar ? (
          <Button
            type="button"
            variante="secundario"
            tamanho="sm"
            carregando={criando}
            onClick={() => void criarEAplicar()}
          >
            <Plus aria-hidden="true" className="size-3.5" />
            Criar a etiqueta &quot;{termo}&quot;
          </Button>
        ) : null}
      </div>
    </div>
  );
}
