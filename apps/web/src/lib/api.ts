import { healthResponseSchema, type HealthResponse } from '@sinapse/shared';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api/v1';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
    /** Mensagem por campo do formulario, quando a API valida com Zod. */
    readonly campos?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface OpcoesDaRequisicao extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Quando true, uma resposta 401 nao tenta renovar a sessao. */
  semRenovacao?: boolean;
}

async function executar(caminho: string, opcoes: OpcoesDaRequisicao = {}): Promise<Response> {
  const { body, semRenovacao: _ignorado, ...resto } = opcoes;

  return fetch(`${API_URL}${caminho}`, {
    ...resto,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...resto.headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
}

/**
 * Cliente HTTP da API.
 *
 * Os tokens ficam em cookies httpOnly, entao o JavaScript nunca os manipula.
 * Se o token de acesso expirar, uma unica tentativa de renovacao e feita antes
 * de desistir. Isso mantem o usuario conectado por dias sem novo login.
 */
export async function apiFetch<T>(caminho: string, opcoes: OpcoesDaRequisicao = {}): Promise<T> {
  let resposta: Response;

  try {
    resposta = await executar(caminho, opcoes);
  } catch {
    throw new ApiError(
      'Nao foi possivel falar com o servidor. Verifique sua conexao e tente de novo.',
    );
  }

  if (resposta.status === 401 && !opcoes.semRenovacao) {
    const renovou = await tentarRenovarSessao();

    if (renovou) {
      try {
        resposta = await executar(caminho, opcoes);
      } catch {
        throw new ApiError('Nao foi possivel falar com o servidor.');
      }
    }
  }

  if (resposta.status === 204) {
    return undefined as T;
  }

  const corpo = (await resposta.json().catch(() => null)) as {
    message?: string;
    campos?: Record<string, string>;
  } | null;

  if (!resposta.ok) {
    throw new ApiError(
      corpo?.message ?? `O servidor respondeu com o status ${resposta.status}`,
      resposta.status,
      corpo?.campos,
    );
  }

  return corpo as T;
}

let renovacaoEmAndamento: Promise<boolean> | null = null;

/** Evita disparar varias renovacoes simultaneas quando a pagina faz N pedidos. */
async function tentarRenovarSessao(): Promise<boolean> {
  renovacaoEmAndamento ??= (async () => {
    try {
      const resposta = await executar('/auth/atualizar', { method: 'POST' });
      return resposta.ok;
    } catch {
      return false;
    } finally {
      setTimeout(() => {
        renovacaoEmAndamento = null;
      }, 0);
    }
  })();

  return renovacaoEmAndamento;
}

/** Consulta o endpoint de saude e valida a resposta com o schema compartilhado. */
export async function buscarSaude(): Promise<HealthResponse> {
  const dados = await apiFetch<unknown>('/health', { semRenovacao: true });
  const resultado = healthResponseSchema.safeParse(dados);

  if (!resultado.success) {
    throw new ApiError('A API respondeu em um formato inesperado.');
  }

  return resultado.data;
}
