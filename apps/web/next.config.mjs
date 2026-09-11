import { config as carregarEnv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// O .env fica na raiz do monorepo e atende frontend e backend ao mesmo tempo.
// O Next nao le arquivos fora da pasta do aplicativo, entao carregamos aqui.
carregarEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });

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
  async rewrites() {
    const backend = process.env.API_INTERNAL_URL;
    if (!backend) return [];

    return [{ source: '/api/v1/:path*', destination: `${backend}/api/v1/:path*` }];
  },
};

export default nextConfig;
