# Sinapse

Plataforma de anotacoes, organizacao de estudos, tarefas e assistente de IA.

> **Estado atual: Etapa 8 concluida.** Monorepo, banco de dados, API, design
> system, autenticacao (com login por Google), navegacao, hierarquia de
> anotacoes com **editor de texto rico** (formatacao, listas, tabelas, blocos
> de codigo, imagens com alinhamento no texto ou flutuante, comandos "/" e
> salvamento automatico), **anexos** em anotacoes e tarefas, **tarefas**
> (lista e quadro Kanban) e **calendario** (visoes Mes e Agenda, recorrencia e
> lembrete por e-mail). Falta so a Etapa 9: o **assistente de IA**.
>
> **Novo: secoes compartilhadas com edicao em tempo real.** O dono de uma
> secao convida outras contas pelo e-mail e escolhe, por pessoa, se ela so le
> ou tambem edita. Quem esta na mesma pagina ve as alteracoes e o cursor dos
> outros na hora (Yjs + Hocuspocus).

---

## Requisitos

| Ferramenta     | Versao minima | Verificar com      |
| -------------- | ------------- | ------------------ |
| Node.js        | 22.11 (LTS)   | `node --version`   |
| pnpm           | 9             | `pnpm --version`   |
| Docker Desktop | 4.30          | `docker --version` |
| Git            | 2.40          | `git --version`    |

Nao e preciso instalar o PostgreSQL no computador: ele roda dentro do Docker.

---

## Primeira execucao

Abra o PowerShell na pasta do projeto e execute, na ordem:

```powershell
# 1. Criar o arquivo de variaveis de ambiente
Copy-Item .env.example .env

# 2. Gerar segredos e colar no .env (JWT_ACCESS_SECRET e JWT_REFRESH_SECRET)
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 3. Instalar as dependencias
pnpm install

# 4. Subir o banco de dados e o Redis
pnpm db:up

# 5. Criar as tabelas
pnpm db:migrate

# 6. Popular com dados de demonstracao
pnpm db:seed

# 7. Iniciar o frontend e o backend juntos
pnpm dev
```

Depois abra <http://localhost:3000> no navegador.

---

## Enderecos

| O que                         | Endereco                                      |
| ----------------------------- | --------------------------------------------- |
| Frontend                      | http://localhost:3000                         |
| Login                         | http://localhost:3000/login                   |
| Criar conta                   | http://localhost:3000/cadastro                |
| Meu perfil                    | http://localhost:3000/configuracoes/perfil    |
| Aparencia                     | http://localhost:3000/configuracoes/aparencia |
| Etiquetas                     | http://localhost:3000/configuracoes/etiquetas |
| Anotacoes                     | http://localhost:3000/notas                   |
| Lixeira                       | http://localhost:3000/lixeira                 |
| Vitrine do design system      | http://localhost:3000/design-system           |
| Diagnostico do ambiente       | http://localhost:3000/diagnostico             |
| API                           | http://localhost:3333/api/v1                  |
| Saude da API e do banco       | http://localhost:3333/api/v1/health           |
| Documentacao da API (Swagger) | http://localhost:3333/api/v1/docs             |
| Prisma Studio                 | http://localhost:5555                         |

## Contas de demonstracao

Criadas pelo seed:

| E-mail                  | Senha          | Observacao                     |
| ----------------------- | -------------- | ------------------------------ |
| `demo@sinapse.app`      | `Sinapse@2026` | E-mail ainda nao confirmado    |
| `professor@sinapse.app` | `Sinapse@2026` | E-mail confirmado, tema escuro |

Entre com as duas em navegadores diferentes para conferir que cada conta
enxerga apenas os proprios conteudos.

## E-mails em desenvolvimento

Sem `RESEND_API_KEY` no `.env`, nenhum e-mail e enviado: os links de verificacao
e de nova senha aparecem no terminal onde a API esta rodando, dentro de um bloco
destacado. Copie o link e abra no navegador para seguir o fluxo.

## Compartilhamento e edicao em tempo real

- No menu de uma secao, **Compartilhar** abre a lista de quem tem acesso. O
  dono convida pelo e-mail (a pessoa precisa ter conta) e escolhe **Pode ler**
  ou **Pode editar**; pode trocar ou remover a qualquer momento.
- As secoes recebidas aparecem em **Compartilhadas comigo**, na barra lateral.
- O editor sincroniza por WebSocket em `/api/v1/colaboracao`. Em
  desenvolvimento o endereco sai de `NEXT_PUBLIC_API_URL`; em producao defina
  `NEXT_PUBLIC_COLLAB_URL` apontando direto para a API (ver `.env.example`).
- Para testar localmente, abra a mesma pagina com duas contas em navegadores
  diferentes (ou uma janela anonima).

---

## Atalhos de teclado

| Atalho         | O que faz                          |
| -------------- | ---------------------------------- |
| `Ctrl K`       | Abre a busca de comandos           |
| `Ctrl B`       | Recolhe ou expande a barra lateral |
| `Ctrl J`       | Alterna entre claro e escuro       |
| `?`            | Mostra a lista de atalhos          |
| `G` depois `I` | Ir para o inicio                   |
| `G` depois `N` | Ir para as anotacoes               |
| `G` depois `T` | Ir para as tarefas                 |
| `G` depois `C` | Ir para o calendario               |
| `G` depois `L` | Ir para a lixeira                  |

Dentro do editor:

| Atalho                     | O que faz                    |
| -------------------------- | ---------------------------- |
| `/`                        | Abre os comandos rapidos     |
| `Ctrl S`                   | Salva agora, sem esperar     |
| `Ctrl B` `Ctrl I` `Ctrl U` | Negrito, italico, sublinhado |
| `Ctrl Shift I`             | Bloco informativo            |
| `Ctrl Z` / `Ctrl Shift Z`  | Desfazer e refazer           |
| `G` depois `P`             | Ir para o perfil             |

Em Mac, `Ctrl` vira `⌘`. Nenhum atalho dispara enquanto voce digita em um campo.

## Comandos

| Comando           | O que faz                                           |
| ----------------- | --------------------------------------------------- |
| `pnpm dev`        | Inicia frontend e backend ao mesmo tempo            |
| `pnpm dev:web`    | Inicia apenas o frontend                            |
| `pnpm dev:api`    | Inicia apenas o backend                             |
| `pnpm build`      | Compila os dois aplicativos                         |
| `pnpm lint`       | Verifica o codigo com ESLint                        |
| `pnpm typecheck`  | Verifica os tipos do TypeScript                     |
| `pnpm test`       | Executa os testes                                   |
| `pnpm format`     | Formata o codigo com Prettier                       |
| `pnpm db:up`      | Sobe PostgreSQL e Redis no Docker                   |
| `pnpm db:down`    | Para os containers, preservando os dados            |
| `pnpm db:reset`   | Apaga os containers e os dados, e sobe tudo de novo |
| `pnpm db:logs`    | Mostra os registros dos containers                  |
| `pnpm db:migrate` | Cria ou aplica migracoes do banco                   |
| `pnpm db:seed`    | Recria os dados de demonstracao                     |
| `pnpm db:studio`  | Abre a interface visual do banco                    |
| `pnpm setup`      | Faz os passos 3 a 6 de uma vez                      |

---

## Estrutura

```
sinapse/
├── apps/
│   ├── api/       API em NestJS + Prisma
│   └── web/       Interface em Next.js
├── packages/
│   └── shared/    Tipos e validacoes usados pelos dois lados
├── docker-compose.yml
└── .env           Nunca versionado
```

---

## Seguranca

- O arquivo `.env` esta no `.gitignore` e nunca deve ser enviado ao repositorio.
- Chaves de API de IA e do Google ficam somente no servidor. Apenas variaveis com
  prefixo `NEXT_PUBLIC_` chegam ao navegador.
- Senhas sao guardadas com Argon2id, nunca em texto puro.
- Secoes compartilhadas: as permissoes sao aplicadas na camada de dados (cliente
  Prisma escopado por nivel de acesso), nao so na tela. A conexao de edicao em
  tempo real usa um ticket de 60s valido para uma pagina, confere a permissao
  a cada conexao, recusa Origins fora de `WEB_ORIGIN` e cai na hora quando o
  dono troca o papel ou remove alguem.

## Licenca

Projeto privado. Todos os direitos reservados.
