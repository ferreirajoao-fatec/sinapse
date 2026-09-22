import { config as carregarEnv } from 'dotenv';
import { existsSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// O .env fica na raiz do monorepo e atende frontend e backend ao mesmo tempo.
// O Next nao le arquivos fora da pasta do aplicativo, entao carregamos aqui.
carregarEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });

/**
 * Uma copia so de cada pacote do ProseMirror no bundle.
 *
 * O editor (via @tiptap/pm) e a edicao em tempo real (via y-prosemirror)
 * importam prosemirror-model, -state e -view por caminhos diferentes do pnpm.
 * Sem o alias, o webpack empacota duas copias da mesma versao, e o editor
 * colaborativo quebra na primeira digitacao ("Can not convert ... to a
 * Fragment (looks like multiple versions of prosemirror-model were loaded)").
 * Aqui todos passam a apontar para a pasta que o proprio @tiptap/pm usa.
 */
const exigir = createRequire(import.meta.url);
const pastaDoTiptapPm = pastaDoPacote(exigir.resolve('@tiptap/pm/model'));

function pastaDoPacote(arquivo) {
  let pasta = dirname(arquivo);
  while (!existsSync(join(pasta, 'package.json')) || pasta.endsWith('dist')) {
    pasta = dirname(pasta);
  }
  return pasta;
}

const PACOTES_DO_PROSEMIRROR = [
  'prosemirror-model',
  'prosemirror-state',
  'prosemirror-view',
  'prosemirror-transform',
];

const aliasDoProsemirror = Object.fromEntries(
  PACOTES_DO_PROSEMIRROR.map((pacote) => [
    pacote,
    realpathSync(pastaDoPacote(exigir.resolve(pacote, { paths: [pastaDoTiptapPm] }))),
  ]),
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // O pacote compartilhado e distribuido como TypeScript, entao o Next precisa compila-lo.
  transpilePackages: ['@sinapse/shared'],
  eslint: {
    // Os hooks do projeto seguem a convencao "usar*" (portugues), entao a regra
    // react-hooks/rules-of-hooks nao os reconhece como hooks e reprova o build de
    // producao. O lint continua rodando normalmente via `pnpm lint`.
    ignoreDuringBuilds: true,
  },
  // Repassa as chamadas de API para o backend real sem sair do dominio do
  // navegador: assim os cookies httpOnly de sessao continuam "mesmo site"
  // mesmo com web e api hospedados em dominios diferentes (Vercel + Railway).
  // Em desenvolvimento local API_INTERNAL_URL fica vazio e o rewrite vira no-op.
  webpack(configuracao) {
    configuracao.resolve.alias = { ...configuracao.resolve.alias, ...aliasDoProsemirror };
    return configuracao;
  },
  async rewrites() {
    const backend = process.env.API_INTERNAL_URL;
    if (!backend) return [];

    return [{ source: '/api/v1/:path*', destination: `${backend}/api/v1/:path*` }];
  },
};

export default nextConfig;
