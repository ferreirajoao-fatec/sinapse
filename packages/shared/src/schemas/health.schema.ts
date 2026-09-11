import { z } from 'zod';

/**
 * Contrato da resposta do endpoint GET /api/v1/health.
 * O frontend usa este schema para validar o que recebeu da API.
 */
export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  app: z.string(),
  version: z.string(),
  environment: z.string(),
  timestamp: z.string(),
  uptimeSeconds: z.number(),
  database: z.object({
    connected: z.boolean(),
    latencyMs: z.number().nullable(),
    error: z.string().nullable(),
  }),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
