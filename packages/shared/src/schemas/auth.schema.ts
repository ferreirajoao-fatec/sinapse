import { z } from 'zod';

/**
 * Regras de validacao de autenticacao.
 * Sao as mesmas no navegador e no servidor: o formulario e a API
 * rejeitam exatamente os mesmos valores, sem duplicar regra.
 */

export const passwordSchema = z
  .string()
  .min(8, 'A senha precisa ter ao menos 8 caracteres')
  .max(128, 'A senha pode ter no maximo 128 caracteres')
  .regex(/[a-z]/, 'A senha precisa ter ao menos uma letra minuscula')
  .regex(/[A-Z]/, 'A senha precisa ter ao menos uma letra maiuscula')
  .regex(/[0-9]/, 'A senha precisa ter ao menos um numero');

// A ordem importa: no Zod, transformacoes e validacoes rodam na sequencia em
// que sao encadeadas. Limpar espacos e normalizar antes de validar evita
// recusar um e-mail correto que veio com espaco no comeco ou letra maiuscula.
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Informe o e-mail')
  .email('Informe um e-mail valido');

export const nameSchema = z
  .string()
  .trim()
  .min(2, 'Informe seu nome')
  .max(120, 'O nome pode ter no maximo 120 caracteres');

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Informe a senha'),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token ausente'),
  password: passwordSchema,
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token ausente'),
});

export const resendVerificationSchema = z.object({
  email: emailSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;

/**
 * Mede a forca da senha para o indicador visual do formulario.
 * Nao substitui a validacao: e apenas orientacao para o usuario.
 */
export function medirForcaDaSenha(senha: string): {
  pontos: 0 | 1 | 2 | 3 | 4;
  rotulo: 'muito fraca' | 'fraca' | 'razoavel' | 'boa' | 'forte';
} {
  let pontos = 0;
  if (senha.length >= 8) pontos += 1;
  if (senha.length >= 12) pontos += 1;
  if (/[a-z]/.test(senha) && /[A-Z]/.test(senha) && /[0-9]/.test(senha)) pontos += 1;
  if (/[^A-Za-z0-9]/.test(senha)) pontos += 1;

  const rotulos = ['muito fraca', 'fraca', 'razoavel', 'boa', 'forte'] as const;
  const nivel = Math.min(pontos, 4) as 0 | 1 | 2 | 3 | 4;

  return { pontos: nivel, rotulo: rotulos[nivel] };
}
