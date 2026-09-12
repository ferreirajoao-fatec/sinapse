import { z } from 'zod';
import { FONT_FAMILIES, LOCALES, THEMES } from '../constants';
import { emailSchema, nameSchema, passwordSchema } from './auth.schema';

/** Formato publico do usuario. Nunca contem hash de senha nem tokens. */
export const usuarioPublicoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string(),
  avatarUrl: z.string().nullable(),
  emailVerified: z.boolean(),
  hasPassword: z.boolean(),
  connectedProviders: z.array(z.string()),
  storageUsedBytes: z.number(),
  storageQuotaBytes: z.number(),
  createdAt: z.string(),
  preferences: z.object({
    theme: z.enum(THEMES),
    locale: z.enum(LOCALES),
    fontFamily: z.enum(FONT_FAMILIES),
    fontScale: z.number(),
    reducedMotion: z.boolean(),
    aiEnabled: z.boolean(),
  }),
});

export type UsuarioPublico = z.infer<typeof usuarioPublicoSchema>;

export const sessaoSchema = z.object({
  usuario: usuarioPublicoSchema,
});

export type Sessao = z.infer<typeof sessaoSchema>;

export const atualizarPerfilSchema = z.object({
  name: nameSchema.optional(),
  avatarUrl: z.string().url('Informe uma URL valida').max(500).nullable().optional(),
});

export const alterarSenhaSchema = z.object({
  senhaAtual: z.string().min(1, 'Informe a senha atual'),
  novaSenha: passwordSchema,
});

export const definirSenhaSchema = z.object({
  novaSenha: passwordSchema,
});

export const atualizarPreferenciasSchema = z.object({
  theme: z.enum(THEMES).optional(),
  locale: z.enum(LOCALES).optional(),
  fontFamily: z.enum(FONT_FAMILIES).optional(),
  fontScale: z.number().int().min(80).max(150).optional(),
  reducedMotion: z.boolean().optional(),
});

export const excluirContaSchema = z.object({
  confirmacao: z.literal('EXCLUIR', {
    errorMap: () => ({ message: 'Digite EXCLUIR para confirmar' }),
  }),
  senha: z.string().optional(),
});

export type AtualizarPerfilInput = z.infer<typeof atualizarPerfilSchema>;
export type AlterarSenhaInput = z.infer<typeof alterarSenhaSchema>;
export type DefinirSenhaInput = z.infer<typeof definirSenhaSchema>;
export type AtualizarPreferenciasInput = z.infer<typeof atualizarPreferenciasSchema>;
export type ExcluirContaInput = z.infer<typeof excluirContaSchema>;

/** Nome de cada provedor externo, para exibir na tela de perfil. */
export const NOMES_DOS_PROVEDORES: Record<string, string> = {
  google: 'Google',
};

/** E-mail duplicado tambem existe do lado do usuario. */
export const emailJaCadastradoSchema = z.object({ email: emailSchema });
