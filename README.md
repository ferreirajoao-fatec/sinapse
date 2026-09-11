# Sinapse

Plataforma de anotacoes, organizacao de estudos, tarefas e assistente de IA.

> **Estado atual: Etapa 4 concluida.** Monorepo, banco de dados, API, design system,
> autenticacao, navegacao, hierarquia de anotacoes e o **editor de texto rico**:
> formatacao, listas, tabelas, blocos de codigo, comandos "/" e salvamento
> automatico.

---

## Requisitos

| Ferramenta     | Versao minima | Verificar com          |
| -------------- | ------------- | ---------------------- |
| Node.js        | 22.11 (LTS)   | `node --version`       |
| pnpm           | 9             | `pnpm --version`       |
| Docker Desktop | 4.30          | `docker --version`     |
| Git            | 2.40          | `git --version`        |

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

| O que                        | Endereco                              |
| ---------------------------- | ------------------------------------- |
| Frontend                     | http://localhost:3000                 |
| Login                        | http://localhost:3000/login           |
| Criar conta                  | http://localhost:3000/cadastro        |
| Meu perfil                   | http://localhost:3000/configuracoes/perfil |
| Aparencia                    | http://localhost:3000/configuracoes/aparencia |
| Etiquetas                    | http://localhost:3000/configuracoes/etiquetas |
| Anotacoes                    | http://localhost:3000/notas           |
| Lixeira                      | http://localhost:3000/lixeira         |
| Vitrine do design system     | http://localhost:3000/design-system   |
| Diagnostico do ambiente      | http://localhost:3000/diagnostico     |
| API                          | http://localhost:3333/api/v1          |
| Saude da API e do banco      | http://localhost:3333/api/v1/health   |
| Documentacao da API (Swagger)| http://localhost:3333/api/v1/docs     |
| Prisma Studio               | http://localhost:5555                 |

## Contas de demonstracao

Criadas pelo seed:

| E-mail                  | Senha          | Observacao                        |
| ----------------------- | -------------- | --------------------------------- |
| `demo@sinapse.app`      | `Sinapse@2026` | E-mail ainda nao confirmado       |
| `professor@sinapse.app` | `Sinapse@2026` | E-mail confirmado, tema escuro    |

Entre com as duas em navegadores diferentes para conferir que cada conta
enxerga apenas os proprios conteudos.

## E-mails em desenvolvimento

Sem `RESEND_API_KEY` no `.env`, nenhum e-mail e enviado: os links de verificacao
e de nova senha aparecem no terminal onde a API esta rodando, dentro de um bloco
destacado. Copie o link e abra no navegador para seguir o fluxo.

---

## Atalhos de teclado

| Atalho              | O que faz                             |
| ------------------- | ------------------------------------- |
| `Ctrl K`            | Abre a busca de comandos              |
| `Ctrl B`            | Recolhe ou expande a barra lateral    |
| `Ctrl J`            | Alterna entre claro e escuro          |
| `?`                 | Mostra a lista de atalhos             |
| `G` depois `I`      | Ir para o inicio                      |
| `G` depois `N`      | Ir para as anotacoes                  |
| `G` depois `T`      | Ir para as tarefas                    |
| `G` depois `C`      | Ir para o calendario                  |
| `G` depois `L`      | Ir para a lixeira                     |

Dentro do editor:

| Atalho              | O que faz                             |
| ------------------- | ------------------------------------- |
| `/`                 | Abre os comandos rapidos              |
| `Ctrl S`            | Salva agora, sem esperar              |
| `Ctrl B` `Ctrl I` `Ctrl U` | Negrito, italico, sublinhado    |
| `Ctrl Shift I`      | Bloco informativo                     |
| `Ctrl Z` / `Ctrl Shift Z` | Desfazer e refazer              |
| `G` depois `P`      | Ir para o perfil                      |

Em Mac, `Ctrl` vira `⌘`. Nenhum atalho dispara enquanto voce digita em um campo.

## Comandos

| Comando            | O que faz                                              |
| ------------------ | ------------------------------------------------------ |
| `pnpm dev`         | Inicia frontend e backend ao mesmo tempo               |
| `pnpm dev:web`     | Inicia apenas o frontend                               |
| `pnpm dev:api`     | Inicia apenas o backend                                |
| `pnpm build`       | Compila os dois aplicativos                            |
| `pnpm lint`        | Verifica o codigo com ESLint                           |
| `pnpm typecheck`   | Verifica os tipos do TypeScript                        |
| `pnpm test`        | Executa os testes                                      |
| `pnpm format`      | Formata o codigo com Prettier                          |
| `pnpm db:up`       | Sobe PostgreSQL e Redis no Docker                      |
| `pnpm db:down`     | Para os containers, preservando os dados               |
| `pnpm db:reset`    | Apaga os containers e os dados, e sobe tudo de novo    |
| `pnpm db:logs`     | Mostra os registros dos containers                     |
| `pnpm db:migrate`  | Cria ou aplica migracoes do banco                      |
| `pnpm db:seed`     | Recria os dados de demonstracao                        |
| `pnpm db:studio`   | Abre a interface visual do banco                       |
| `pnpm setup`       | Faz os passos 3 a 6 de uma vez                         |

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

## Licenca

Projeto privado. Todos os direitos reservados.
