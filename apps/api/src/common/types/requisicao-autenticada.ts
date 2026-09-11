import type { Request } from 'express';

/** Dados que o guard coloca na requisicao depois de validar o token. */
export interface UsuarioDaRequisicao {
  id: string;
  email: string;
}

export interface RequisicaoAutenticada extends Request {
  usuario?: UsuarioDaRequisicao;
}
