# Inicio rapido - Windows

Guia de bolso. A explicacao completa esta no README.md.

## Uma vez, na primeira execucao

```powershell
Copy-Item .env.example .env
notepad .env          # cole os dois segredos JWT
pnpm install
pnpm db:up
pnpm db:migrate       # nome sugerido: inicial
pnpm db:seed
```

## Todo dia, para trabalhar

```powershell
pnpm db:up            # se o Docker Desktop foi reiniciado
pnpm dev              # frontend + backend juntos
```

Abra <http://localhost:3000>. Para parar: Ctrl+C no terminal e `pnpm db:down`.

## Se algo der errado

| Sintoma                                   | O que fazer                                        |
| ----------------------------------------- | -------------------------------------------------- |
| `pnpm` nao e reconhecido                  | `corepack enable pnpm` e abra um novo terminal      |
| `Can't reach database server`             | `pnpm db:up` e aguarde 10 segundos                  |
| `port 5432 already allocated`             | Mude `POSTGRES_PORT` no `.env` para 5433            |
| `EADDRINUSE :3000` ou `:3333`             | Feche a outra janela ou mude a porta no `.env`      |
| A pagina mostra "A API nao respondeu"     | Confira se `pnpm dev:api` esta em execucao          |
| Erro do Prisma apos mudar o schema        | `pnpm db:generate`                                  |
| Quero comecar do zero                     | `pnpm db:reset` seguido de `pnpm db:migrate`        |
