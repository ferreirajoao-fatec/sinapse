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
};

export default nextConfig;
