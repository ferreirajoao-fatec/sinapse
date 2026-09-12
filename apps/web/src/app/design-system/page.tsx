'use client';

import { ArrowLeft, FileQuestion, Plus, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { AlternarTema } from '@/components/alternar-tema';
import { Marca } from '@/components/marca';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

const cores = [
  { nome: 'Neutro', variavel: '--color-neutro-200', hex: '#e7e6e3', uso: 'Bordas e separadores' },
  { nome: 'Superficie', variavel: '--superficie', hex: 'adapta', uso: 'Fundo de cartoes' },
  { nome: 'Marca', variavel: '--color-marca-500', hex: '#5b4bd6', uso: 'Acoes principais' },
  { nome: 'Estudo', variavel: '--color-estudo-500', hex: '#0f9d8f', uso: 'Progresso e revisao' },
  { nome: 'Sucesso', variavel: '--color-sucesso-500', hex: '#2f9e57', uso: 'Confirmacoes' },
  { nome: 'Atencao', variavel: '--color-atencao-500', hex: '#c8830f', uso: 'Prazos proximos' },
  { nome: 'Perigo', variavel: '--color-perigo-500', hex: '#d34a45', uso: 'Exclusao e erros' },
];

export default function PaginaDesignSystem() {
  const [carregando, setCarregando] = useState(false);
  const [email, setEmail] = useState('');

  const emailInvalido = email.length > 0 && !email.includes('@');

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 sm:px-8">
      <header className="flex items-center justify-between gap-4 pb-10">
        <Marca />
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--texto-suave)] transition-colors hover:text-[var(--texto)]"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Inicio
          </Link>
          <AlternarTema />
        </div>
      </header>

      <main id="conteudo" className="space-y-12 pb-16">
        <section className="space-y-2">
          <h1 className="font-serif text-4xl tracking-tight">Design system</h1>
          <p className="max-w-xl text-[var(--texto-suave)]">
            Os blocos visuais do Sinapse. Tudo o que for construido nas proximas etapas usa estes
            componentes, e nao estilos soltos.
          </p>
        </section>

        <Secao titulo="Cores" descricao="Fundo neutro, destaque apenas em acoes e status">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {cores.map((cor) => (
              <div key={cor.nome} className="superficie overflow-hidden">
                <div
                  className="h-14 border-b"
                  style={{ backgroundColor: `var(${cor.variavel})` }}
                  aria-hidden="true"
                />
                <div className="space-y-0.5 p-3">
                  <p className="text-sm font-medium">{cor.nome}</p>
                  <p className="text-2xs font-mono text-[var(--texto-tenue)]">{cor.hex}</p>
                  <p className="text-2xs text-[var(--texto-suave)]">{cor.uso}</p>
                </div>
              </div>
            ))}
          </div>
        </Secao>

        <Secao
          titulo="Tipografia"
          descricao="Serifada na marca e nos titulos, sem serifa na interface"
        >
          <div className="superficie space-y-4 p-6">
            <p className="font-serif text-4xl tracking-tight">Instrument Serif 40</p>
            <p className="text-2xl font-medium">Inter Medium 24</p>
            <p className="text-base">
              Inter Regular 16 - corpo de texto das anotacoes, com altura de linha confortavel para
              leitura longa.
            </p>
            <p className="text-sm text-[var(--texto-suave)]">Inter 14 - textos de apoio</p>
            <p className="font-mono text-sm">IBM Plex Mono 14 - blocos de codigo</p>
          </div>
        </Secao>

        <Secao titulo="Botoes" descricao="Cinco variantes, quatro tamanhos, estado de carregamento">
          <div className="superficie space-y-5 p-6">
            <div className="flex flex-wrap items-center gap-3">
              <Button>Salvar anotacao</Button>
              <Button variante="secundario">Cancelar</Button>
              <Button variante="discreto">Mais opcoes</Button>
              <Button variante="perigo">
                <Trash2 aria-hidden="true" className="size-4" />
                Excluir
              </Button>
              <Button variante="link">Saiba mais</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button tamanho="sm">Pequeno</Button>
              <Button tamanho="md">Medio</Button>
              <Button tamanho="lg">Grande</Button>
              <Button tamanho="icone" variante="secundario" aria-label="Nova pagina">
                <Plus aria-hidden="true" className="size-4" />
              </Button>
              <Button disabled>Desabilitado</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                carregando={carregando}
                onClick={() => {
                  setCarregando(true);
                  setTimeout(() => setCarregando(false), 1400);
                }}
              >
                Testar carregamento
              </Button>
            </div>
          </div>
        </Secao>

        <Secao titulo="Campos" descricao="Rotulo sempre visivel, erro anunciado por leitor de tela">
          <div className="superficie grid gap-5 p-6 sm:grid-cols-2">
            <Input rotulo="Nome do grupo" placeholder="Faculdade" auxilio="Ate 80 caracteres" />
            <Input
              rotulo="E-mail"
              type="email"
              placeholder="voce@exemplo.com"
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
              erro={emailInvalido ? 'Informe um e-mail valido' : undefined}
            />
            <Input rotulo="Buscar" placeholder="Pesquisar em tudo" />
            <Input rotulo="Desabilitado" placeholder="Indisponivel" disabled />
          </div>
        </Secao>

        <Secao titulo="Etiquetas" descricao="Status, prioridades e categorias">
          <div className="superficie flex flex-wrap items-center gap-2 p-6">
            <Badge>Rascunho</Badge>
            <Badge tom="marca">Favorito</Badge>
            <Badge tom="estudo">Revisar</Badge>
            <Badge tom="sucesso">Concluido</Badge>
            <Badge tom="atencao">Entrega proxima</Badge>
            <Badge tom="perigo">Atrasado</Badge>
          </div>
        </Secao>

        <Secao titulo="Mensagens" descricao="Direcao clara em vez de tom de desculpa">
          <div className="space-y-3">
            <Alert tipo="informacao" titulo="Salvamento automatico ativo">
              As alteracoes sao gravadas sozinhas enquanto voce escreve.
            </Alert>
            <Alert tipo="sucesso" titulo="Anotacao salva">
              A versao anterior continua disponivel no historico.
            </Alert>
            <Alert tipo="atencao" titulo="Armazenamento quase cheio">
              Voce usou 92% do espaco. Remova arquivos antigos na lixeira para liberar.
            </Alert>
            <Alert tipo="erro" titulo="O arquivo excede 50 MB">
              Compacte o arquivo ou envie uma versao menor.
            </Alert>
          </div>
        </Secao>

        <Secao titulo="Cartoes" descricao="Contêiner padrao de conteudo">
          <Card>
            <CardHeader
              titulo="Banco de Dados"
              descricao="4 paginas - atualizado ha 2 minutos"
              acao={<Badge tom="marca">Fixado</Badge>}
            />
            <CardContent>
              <p className="text-sm text-[var(--texto-suave)]">
                A terceira forma normal elimina dependencias transitivas entre atributos nao chave.
              </p>
            </CardContent>
            <CardFooter>
              <Button tamanho="sm" variante="secundario">
                Abrir
              </Button>
              <Button tamanho="sm" variante="discreto">
                Duplicar
              </Button>
            </CardFooter>
          </Card>
        </Secao>

        <Secao titulo="Carregamento e vazio" descricao="Nunca uma tela em branco sem direcao">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardContent className="space-y-3 pt-5">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
            <Card>
              <EstadoVazio
                icone={<FileQuestion className="size-5" />}
                titulo="Nenhuma pagina ainda"
                descricao="Crie a primeira pagina desta secao para comecar a anotar."
                acao={
                  <Button tamanho="sm">
                    <Plus aria-hidden="true" className="size-4" />
                    Nova pagina
                  </Button>
                }
              />
            </Card>
          </div>
        </Secao>

        <Secao titulo="Espacamento" descricao="Escala de 4 pixels usada em todo o produto">
          <div className="superficie flex flex-wrap items-end gap-4 p-6">
            {[1, 2, 3, 4, 6, 8, 12].map((passo) => (
              <div key={passo} className="space-y-2 text-center">
                <div
                  className="bg-marca-200 dark:bg-marca-700 rounded-sm"
                  style={{ width: passo * 4, height: passo * 4 }}
                  aria-hidden="true"
                />
                <span className="text-2xs font-mono text-[var(--texto-tenue)]">{passo * 4}</span>
              </div>
            ))}
          </div>
        </Secao>

        <Secao titulo="Acessibilidade" descricao="Verificacoes que valem para todo componente novo">
          <div className="superficie space-y-2 p-6 text-sm text-[var(--texto-suave)]">
            <p className="flex items-start gap-2">
              <Search aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              Navegue com a tecla Tab: todo elemento interativo desta pagina mostra um contorno de
              foco visivel.
            </p>
            <p>Contraste minimo de 4,5:1 entre texto e fundo nos dois temas.</p>
            <p>Icones decorativos usam aria-hidden; icones sozinhos usam aria-label.</p>
            <p>Animacoes sao desligadas quando o sistema pede movimento reduzido.</p>
          </div>
        </Secao>
      </main>
    </div>
  );
}

function Secao({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-0.5">
        <h2 className="text-lg font-medium">{titulo}</h2>
        <p className="text-sm text-[var(--texto-suave)]">{descricao}</p>
      </div>
      {children}
    </section>
  );
}
