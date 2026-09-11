import type {
  AlterarSenhaInput,
  AtualizarPerfilInput,
  AtualizarPreferenciasInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  UsuarioPublico,
} from '@sinapse/shared';
import { API_URL, apiFetch } from './api';

interface RespostaSimples {
  mensagem: string;
}

export function cadastrar(dados: RegisterInput) {
  return apiFetch<RespostaSimples>('/auth/cadastrar', {
    method: 'POST',
    body: dados,
    semRenovacao: true,
  });
}

export function entrar(dados: LoginInput) {
  return apiFetch<RespostaSimples>('/auth/entrar', {
    method: 'POST',
    body: dados,
    semRenovacao: true,
  });
}

export function sair() {
  return apiFetch<void>('/auth/sair', { method: 'POST', semRenovacao: true });
}

export function buscarSessao() {
  return apiFetch<UsuarioPublico>('/auth/sessao');
}

export function esqueciSenha(dados: ForgotPasswordInput) {
  return apiFetch<RespostaSimples>('/auth/esqueci-senha', {
    method: 'POST',
    body: dados,
    semRenovacao: true,
  });
}

export function redefinirSenha(dados: ResetPasswordInput) {
  return apiFetch<RespostaSimples>('/auth/redefinir-senha', {
    method: 'POST',
    body: dados,
    semRenovacao: true,
  });
}

export function verificarEmail(token: string) {
  return apiFetch<RespostaSimples & { email: string }>('/auth/verificar-email', {
    method: 'POST',
    body: { token },
    semRenovacao: true,
  });
}

export function reenviarVerificacao(email: string) {
  return apiFetch<RespostaSimples>('/auth/reenviar-verificacao', {
    method: 'POST',
    body: { email },
    semRenovacao: true,
  });
}

export function googleDisponivel() {
  return apiFetch<{ habilitado: boolean }>('/auth/google/disponivel', { semRenovacao: true });
}

/** O login com Google e uma navegacao completa, nao uma chamada AJAX. */
export function irParaGoogle(): void {
  window.location.href = `${API_URL}/auth/google`;
}

export function atualizarPerfil(dados: AtualizarPerfilInput) {
  return apiFetch<UsuarioPublico>('/me', { method: 'PATCH', body: dados });
}

export function atualizarPreferencias(dados: AtualizarPreferenciasInput) {
  return apiFetch<UsuarioPublico>('/me/preferencias', { method: 'PATCH', body: dados });
}

export function alterarSenha(dados: AlterarSenhaInput) {
  return apiFetch<void>('/me/senha', { method: 'PATCH', body: dados });
}

export function excluirConta(dados: { confirmacao: 'EXCLUIR'; senha?: string }) {
  return apiFetch<void>('/me', { method: 'DELETE', body: dados });
}

export function urlDeExportacao(): string {
  return `${API_URL}/me/exportar`;
}
