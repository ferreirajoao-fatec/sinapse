import { SetMetadata } from '@nestjs/common';

export const CHAVE_ROTA_PUBLICA = 'rota_publica';

/**
 * Marca uma rota como acessivel sem autenticacao.
 * Tudo o que nao tiver este decorador exige sessao ativa.
 */
export const Publico = () => SetMetadata(CHAVE_ROTA_PUBLICA, true);
