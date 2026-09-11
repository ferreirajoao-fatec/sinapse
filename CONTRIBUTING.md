# Como trabalhar neste projeto

## Fluxo de trabalho no Git

```powershell
git checkout -b etapa/1-autenticacao
# ... alteracoes ...
pnpm format
pnpm lint
pnpm typecheck
pnpm test
git add .
git commit -m "feat(auth): cadastro e login com e-mail e senha"
git push -u origin etapa/1-autenticacao
```

## Padrao de mensagem de commit

Conventional Commits, em portugues:

- `feat(escopo): descricao` - nova funcionalidade
- `fix(escopo): descricao` - correcao de erro
- `refactor(escopo): descricao` - mudanca sem alterar comportamento
- `docs(escopo): descricao` - documentacao
- `test(escopo): descricao` - testes
- `chore(escopo): descricao` - configuracao e manutencao

Escopos usados: `auth`, `notes`, `editor`, `files`, `search`, `tasks`, `calendar`,
`ai`, `ui`, `db`, `infra`.

## Antes de abrir um pull request

1. `pnpm format:check` passa
2. `pnpm lint` passa sem erros
3. `pnpm typecheck` passa
4. `pnpm test` passa
5. `pnpm build` passa

O CI executa exatamente esses cinco comandos.

## Alterando o banco de dados

1. Edite `apps/api/prisma/schema.prisma`
2. Execute `pnpm db:migrate` e informe um nome descritivo para a migracao
3. Faca o commit da pasta `apps/api/prisma/migrations` junto com o schema

Nunca edite uma migracao ja enviada ao repositorio. Crie outra.

## Versoes do TipTap

Todos os pacotes `@tiptap/*` estao fixados na **mesma versao exata**, sem
circunflexo. Nao e descuido: o TipTap distribui vinte pacotes que compartilham
APIs internas, e um deles em versao diferente quebra os outros com erros do
tipo `does not provide an export named ...`.

Ao atualizar, suba **todos** juntos:

```powershell
pnpm --filter @sinapse/web up "@tiptap/*@2.27.4"
```

Nunca atualize um pacote do TipTap isoladamente.
