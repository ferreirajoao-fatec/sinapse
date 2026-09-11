'use client';

import { BookOpen, Clock, FolderPlus, Star } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { PaginaResumida } from '@sinapse/shared';
import { DialogoDeGrupo } from '@/components/conteudos/dialogo-de-grupo';
import { Trilha } from '@/components/navegacao/trilha';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import { Skeleton } from '@/components/ui/skeleton';
import { usarArvore } from '@/hooks/usar-arvore';
import { buscarFavoritas, buscarRecentes } from '@/lib/conteudos';
import { corDeConteudo, iconeDeConteudo } from '@/lib/icones-de-conteudo';
import { cn } from '@/lib/utils';

export default function PaginaDeNotas() {
  const { grupos, carregando } = usarArvore();
  const [recentes, setRecentes] = useState<PaginaResumida[] | null>(null);
  const [favoritas, setFavoritas] = useState<PaginaResumida[] | null>(null);
  const [novoGrupo, setNovoGrupo] = useState(false);

  useEffect(() => {
    void buscarRecentes()
      .then(setRecentes)
      .catch(() => setRecentes([]));
    void buscarFavoritas()
      .then(setFavoritas)
      .catch(() => setFavoritas([]));
  }, [grupos]);

  const totalDePaginas = grupos.reduce(
    (soma, grupo) =>
      soma +
      grupo.secoes.reduce((porGrupo, secao) => porGrupo + contarPaginas(secao.paginas), 0),
    0,
  );

  return (
    <div className="space-y-6">
      <Trilha />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-serif text-3xl tracking-tight">Anotacoes</h1>
          <p className="text-sm text-[var(--texto-suave)]">
            {carregando
              ? 'Carregando seus conteudos...'
              : `${grupos.length} ${grupos.length === 1 ? 'grupo' : 'grupos'} e ${totalDePaginas} ${totalDePaginas === 1 ? 'pagina' : 'paginas'}.`}
          </p>
        </div>

        <Button onClick={() => setNovoGrupo(true)}>
          <FolderPlus aria-hidden="true" className="size-4" />
          Novo grupo
        </Button>
      </div>

      {carregando ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : grupos.length === 0 ? (
        <Card>
          <EstadoVazio
            icone={<BookOpen className="size-5" />}
            titulo="Comece pelo primeiro grupo"
            descricao="Um grupo reune materias relacionadas, como Faculdade ou Estudos pessoais. Dentro dele voce cria secoes e, dentro delas, as paginas."
            acao={
              <Button tamanho="sm" onClick={() => setNovoGrupo(true)}>
                <FolderPlus aria-hidden="true" className="size-4" />
                Criar grupo
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {grupos.map((grupo) => {
            const Icone = iconeDeConteudo(grupo.icon, FolderPlus);
            const paginas = grupo.secoes.reduce(
              (soma, secao) => soma + contarPaginas(secao.paginas),
              0,
            );

            return (
              <Card key={grupo.id}>
                <CardHeader
                  titulo={
                    <span className="flex items-center gap-2">
                      <span
                        className={cn('size-2.5 rounded-full', corDeConteudo(grupo.color).ponto)}
                        aria-hidden="true"
                      />
                      {grupo.name}
                    </span>
                  }
                  descricao={`${grupo.secoes.length} ${grupo.secoes.length === 1 ? 'secao' : 'secoes'} - ${paginas} ${paginas === 1 ? 'pagina' : 'paginas'}`}
                  acao={
                    <span className="flex size-9 items-center justify-center rounded-md bg-[var(--superficie-suave)] text-[var(--texto-suave)]">
                      <Icone aria-hidden="true" className="size-4" />
                    </span>
                  }
                />
                <CardContent>
                  {grupo.secoes.length === 0 ? (
                    <p className="text-sm text-[var(--texto-suave)]">
                      Sem secoes ainda. Use o menu na barra lateral para criar a primeira.
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {grupo.secoes.slice(0, 4).map((secao) => (
                        <li
                          key={secao.id}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <span className="truncate text-[var(--texto-suave)]">{secao.name}</span>
                          <Badge>{contarPaginas(secao.paginas)}</Badge>
                        </li>
                      ))}
                      {grupo.secoes.length > 4 ? (
                        <li className="text-xs text-[var(--texto-tenue)]">
                          e mais {grupo.secoes.length - 4}
                        </li>
                      ) : null}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <ListaDePaginas
          titulo="Abertas recentemente"
          Icone={Clock}
          paginas={recentes}
          vazio="Nenhuma pagina aberta ainda."
        />
        <ListaDePaginas
          titulo="Favoritas"
          Icone={Star}
          paginas={favoritas}
          vazio="Marque uma pagina como favorita para ve-la aqui."
        />
      </div>

      <DialogoDeGrupo aberto={novoGrupo} aoFechar={() => setNovoGrupo(false)} />
    </div>
  );
}

function contarPaginas(paginas: { subpaginas: unknown[] }[]): number {
  return paginas.reduce(
    (soma, pagina) =>
      soma + 1 + contarPaginas(pagina.subpaginas as { subpaginas: unknown[] }[]),
    0,
  );
}

function ListaDePaginas({
  titulo,
  Icone,
  paginas,
  vazio,
}: {
  titulo: string;
  Icone: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  paginas: PaginaResumida[] | null;
  vazio: string;
}) {
  return (
    <Card>
      <CardHeader
        titulo={
          <span className="flex items-center gap-2">
            <Icone aria-hidden className="size-4 text-[var(--texto-suave)]" />
            {titulo}
          </span>
        }
      />
      <CardContent>
        {paginas === null ? (
          <div className="space-y-2" aria-hidden="true">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-4/5" />
          </div>
        ) : paginas.length === 0 ? (
          <p className="text-sm text-[var(--texto-suave)]">{vazio}</p>
        ) : (
          <ul className="space-y-0.5">
            {paginas.slice(0, 6).map((pagina) => {
              const IconePagina = iconeDeConteudo(pagina.icon);

              return (
                <li key={pagina.id}>
                  <Link
                    href={`/notas/${pagina.id}`}
                    className="flex items-center gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-[var(--superficie-suave)]"
                  >
                    <IconePagina
                      aria-hidden="true"
                      className="size-4 shrink-0 text-[var(--texto-tenue)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{pagina.title}</span>
                      <span className="block truncate text-2xs text-[var(--texto-tenue)]">
                        {pagina.caminho.grupo} / {pagina.caminho.secao}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
