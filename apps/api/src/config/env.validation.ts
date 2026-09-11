import { z } from 'zod';

/**
 * Valida as variaveis de ambiente na inicializacao da API.
 * Se algo estiver faltando ou invalido, a aplicacao para imediatamente
 * com uma mensagem clara, em vez de falhar depois em producao.
 */
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_PORT: z.coerce.number().int().min(1).max(65535).default(3333),
    WEB_ORIGIN: z.string().url().default('http://localhost:3000'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL nao foi definida no arquivo .env'),

    JWT_ACCESS_SECRET: z
      .string()
      .min(32, 'JWT_ACCESS_SECRET precisa ter ao menos 32 caracteres')
      .default('desenvolvimento_local_access_secret_trocar_em_producao'),
    JWT_REFRESH_SECRET: z
      .string()
      .min(32, 'JWT_REFRESH_SECRET precisa ter ao menos 32 caracteres')
      .default('desenvolvimento_local_refresh_secret_trocar_em_producao'),
    JWT_ACCESS_TTL: z.string().default('15m'),
    JWT_REFRESH_TTL: z.string().default('7d'),

    /** Login com Google. Deixe em branco para desativar o botao no frontend. */
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GOOGLE_REDIRECT_URI: z
      .string()
      .url()
      .default('http://localhost:3333/api/v1/auth/google/callback'),

    /** Envio de e-mail. Sem a chave, os links sao impressos no terminal. */
    RESEND_API_KEY: z.string().optional(),
    MAIL_FROM: z.string().default('Sinapse <onboarding@resend.dev>'),
  })
  .superRefine((valores, ctx) => {
    const temId = Boolean(valores.GOOGLE_CLIENT_ID);
    const temSegredo = Boolean(valores.GOOGLE_CLIENT_SECRET);

    if (temId !== temSegredo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['GOOGLE_CLIENT_ID'],
        message:
          'Defina GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET juntos, ou deixe os dois em branco.',
      });
    }

    if (valores.NODE_ENV === 'production') {
      if (valores.JWT_ACCESS_SECRET.startsWith('desenvolvimento_local')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_ACCESS_SECRET'],
          message: 'Em producao o segredo padrao de desenvolvimento nao pode ser usado.',
        });
      }
      if (valores.JWT_REFRESH_SECRET.startsWith('desenvolvimento_local')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_REFRESH_SECRET'],
          message: 'Em producao o segredo padrao de desenvolvimento nao pode ser usado.',
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const problemas = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(
      `Configuracao invalida no arquivo .env:\n${problemas}\n\n` +
        'Copie o arquivo .env.example para .env na raiz do projeto e preencha os valores.',
    );
  }

  return result.data;
}
