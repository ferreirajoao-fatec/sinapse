'use client';

import type { PaginaResumida } from '@sinapse/shared';
import { ArrowRight, BookOpen, Clock, FolderPlus, Star } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AvisoDeVerificacao } from '@/components/aviso-de-verificacao';
import { DialogoDeGrupo } from '@/components/conteudos/dialogo-de-grupo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import { Skeleton } from '@/components/ui/skeleton';
import { usarArvore } from '@/hooks/usar-arvore';
import { usarUsuario } from '@/hooks/usar-usuario';
import { buscarFavoritas, buscarRecentes } from '@/lib/conteudos';
import { iconeDeConteudo } from '@/lib/icones-de-conteudo';

function saudacao(): string {
  const hora = new Date().getHours();
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function PaginaInicial() {
  const { usuario } = usarUsuario();
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

  if (!usuario) {
    return null;
  }

  const primeiroNome = usuario.name.split(' ')[0] ?? usuario.name;
  const hoje = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  const semConteudo = !carregando && grupos.length === 0;

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="font-serif text-3xl tracking-tight sm:text-4xl">
          {saudacao()}, {primeiroNome}
        </h1>
        <p className="text-sm text-[var(--texto-suave)] first-letter:uppercase">{hoje}</p>
      </div>

      <AvisoDeVerificacao />

      {semConteudo ? (
        <Card>
          <EstadoVazio
            icone={<BookOpen className="size-5" />}
            titulo="Vamos organizar seus estudos"
            descricao="Comece criando um grupo, como Faculdade. Dentro dele voce cria secoes por materia e, dentro delas, as paginas das aulas."
            acao={
              <Button tamanho="sm" onClick={() => setNovoGrupo(true)}>
                <FolderPlus aria-hidden="true" className="size-4" />
                Criar meu primeiro grupo
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <ListaDePaginas
            titulo="Continue de onde parou"
            Icone={Clock}
            paginas={recentes}
            vazio="Abra uma pagina e ela aparece aqui."
          />
          <ListaDePaginas
            titulo="Favoritas"
            Icone={Star}
            paginas={favoritas}
            vazio="Marque uma pagina com a estrela para acessa-la rapido."
          />
        </div>
      )}

      <Card>
        <CardHeader
          titulo="Sua hierarquia esta pronta"
          descricao="Grupos, secoes, paginas e subpaginas, com arrastar e soltar, etiquetas e lixeira."
          acao={<Badge tom="sucesso">Etapa 3</Badge>}
        />
        <CardContent className="space-y-3">
          <p className="text-sm text-[var(--texto-suave)]">
            O proximo passo e o editor de texto: formatacao, tabelas, blocos de codigo, formulas e
            salvamento automatico enquanto voce escreve.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/notas"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors hover:bg-[var(--superficie-suave)]"
            >
              Abrir anotacoes
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
            <Link
              href="/configuracoes/etiquetas"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors hover:bg-[var(--superficie-suave)]"
            >
              Gerenciar etiquetas
            </Link>
          </div>
        </CardContent>
      </Card>

      <DialogoDeGrupo aberto={novoGrupo} aoFechar={() => setNovoGrupo(false)} />
    </div>
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
            {paginas.slice(0, 5).map((pagina) => {
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
