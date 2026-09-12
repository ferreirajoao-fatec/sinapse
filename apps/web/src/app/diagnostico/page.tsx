import { ArrowRight, Palette, TerminalSquare } from 'lucide-react';
import Link from 'next/link';
import { AlternarTema } from '@/components/alternar-tema';
import { EstadoDaApi } from '@/components/estado-da-api';
import { Marca } from '@/components/marca';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { API_URL } from '@/lib/api';

const proximosPassos = [
  {
    etapa: '1',
    titulo: 'Cadastro e login',
    descricao: 'JWT, Google OAuth e verificacao de e-mail',
  },
  { etapa: '2', titulo: 'Layout do aplicativo', descricao: 'Barra lateral, breadcrumbs e atalhos' },
  { etapa: '3', titulo: 'Grupos, secoes e paginas', descricao: 'Hierarquia com arrastar e soltar' },
  { etapa: '4', titulo: 'Editor de anotacoes', descricao: 'TipTap com salvamento automatico' },
];

export default function PaginaInicial() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-4xl flex-col px-6 py-8 sm:px-8">
      <header className="flex items-center justify-between gap-4">
        <Marca />
        <div className="flex items-center gap-2">
          <Badge tom="marca">Etapa 0</Badge>
          <AlternarTema />
        </div>
      </header>

      <main id="conteudo" className="flex-1 space-y-8 py-12">
        <section className="space-y-4">
          <h1 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
            O ambiente esta montado.
          </h1>
          <p className="max-w-xl text-[var(--texto-suave)]">
            Monorepo, banco de dados, API e design system em execucao. Use o cartao abaixo para
            confirmar que todas as pecas conversam entre si antes de seguir para a proxima etapa.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href="/design-system"
              className="shadow-suave inline-flex h-10 items-center gap-2 rounded-md bg-[var(--destaque)] px-4 text-sm font-medium text-[var(--contraste-destaque)] transition-colors hover:bg-[var(--destaque-forte)]"
            >
              <Palette aria-hidden="true" className="size-4" />
              Ver o design system
            </Link>
            <a
              href={`${API_URL}/docs`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors hover:bg-[var(--superficie-suave)]"
            >
              <TerminalSquare aria-hidden="true" className="size-4" />
              Documentacao da API
            </a>
          </div>
        </section>

        <EstadoDaApi />

        <Card>
          <CardHeader titulo="O que vem depois" descricao="Roteiro do MVP, uma etapa por vez" />
          <CardContent>
            <ol className="divide-y">
              {proximosPassos.map((passo) => (
                <li key={passo.etapa} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <span className="font-mono text-xs text-[var(--texto-tenue)]">{passo.etapa}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{passo.titulo}</p>
                    <p className="text-xs text-[var(--texto-suave)]">{passo.descricao}</p>
                  </div>
                  <ArrowRight aria-hidden="true" className="size-4 text-[var(--texto-tenue)]" />
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </main>

      <footer className="border-t pt-6 text-xs text-[var(--texto-tenue)]">
        Conta de demonstracao criada pelo seed: demo@sinapse.app / Sinapse@2026
      </footer>
    </div>
  );
}
