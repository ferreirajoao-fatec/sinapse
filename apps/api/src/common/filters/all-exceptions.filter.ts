import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface RespostaDeErro {
  statusCode: number;
  message: string;
  details?: unknown;
  path: string;
  timestamp: string;
}

/**
 * Tratamento centralizado de erros.
 * Padroniza o formato da resposta e evita vazar stack trace para o cliente.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Erro');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erro interno do servidor';
    let details: unknown;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const resposta = exception.getResponse();

      if (typeof resposta === 'string') {
        message = resposta;
      } else if (typeof resposta === 'object' && resposta !== null) {
        const corpo = resposta as { message?: string | string[]; error?: string };
        message = Array.isArray(corpo.message)
          ? corpo.message.join('; ')
          : (corpo.message ?? corpo.error ?? message);
        details = corpo;
      }
    } else if (exception instanceof Error) {
      message =
        process.env.NODE_ENV === 'production' ? 'Erro interno do servidor' : exception.message;
    }

    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(`${request.method} ${request.url} -> ${statusCode}: ${message}`);
    }

    const corpo: RespostaDeErro = {
      statusCode,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    if (details !== undefined && process.env.NODE_ENV !== 'production') {
      corpo.details = details;
    }

    response.status(statusCode).json(corpo);
  }
}
