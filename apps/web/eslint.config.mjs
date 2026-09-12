import { FlatCompat } from '@eslint/eslintrc';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

export default [
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    // Mesmo padrao do packages/shared: variavel prefixada com "_" e
    // destructuring so pra excluir do resto (`...resto`) nao contam como
    // "nao usada".
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
  {
    // Convencao do projeto: hooks tem nome em portugues ("usarArvore",
    // "usarUsuario"...). O plugin react-hooks so reconhece nomes comecando
    // em "use", entao ele os trata como funcao comum e acusa uso invalido
    // de hook. Sao hooks de verdade, seguindo as regras normalmente - o
    // aviso e um falso positivo da heuristica de nome, nao renomeamos para
    // nao trocar a convencao em portugues do resto do app.
    files: ['src/hooks/*.tsx'],
    rules: { 'react-hooks/rules-of-hooks': 'off' },
  },
];
