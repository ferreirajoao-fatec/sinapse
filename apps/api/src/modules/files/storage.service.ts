import {
  DeleteObjectCommand,
  PutObjectCommand,
  GetObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MAX_UPLOAD_SIZE_BYTES } from '@sinapse/shared';
import { randomUUID } from 'node:crypto';

const VALIDADE_URL_DE_UPLOAD_SEGUNDOS = 5 * 60;
const VALIDADE_URL_DE_DOWNLOAD_SEGUNDOS = 10 * 60;

/**
 * Armazenamento de anexos, compativel com qualquer S3 (AWS S3, Cloudflare
 * R2, Backblaze B2, MinIO local). O arquivo nunca passa pela API: o
 * navegador sobe e baixa direto do storage usando URLs assinadas
 * temporarias.
 */
@Injectable()
export class StorageService {
  constructor(private readonly config: ConfigService) {}

  get habilitado(): boolean {
    return Boolean(
      this.config.get<string>('S3_ENDPOINT') &&
      this.config.get<string>('S3_BUCKET') &&
      this.config.get<string>('S3_ACCESS_KEY_ID') &&
      this.config.get<string>('S3_SECRET_ACCESS_KEY'),
    );
  }

  /** Chave unica do objeto no bucket, isolada por tarefa. */
  gerarChave(taskId: string, fileName: string): string {
    const nomeSeguro = fileName.replace(/[^\w.-]+/g, '_').slice(-140);
    return `tasks/${taskId}/${randomUUID()}-${nomeSeguro}`;
  }

  async presignUpload(chave: string, mimeType: string, tamanho: number): Promise<string> {
    if (tamanho > MAX_UPLOAD_SIZE_BYTES) {
      throw new ServiceUnavailableException('Arquivo maior que o limite permitido.');
    }

    const comando = new PutObjectCommand({
      Bucket: this.bucket(),
      Key: chave,
      ContentType: mimeType,
      ContentLength: tamanho,
    });

    return getSignedUrl(this.client(), comando, { expiresIn: VALIDADE_URL_DE_UPLOAD_SEGUNDOS });
  }

  async presignDownload(chave: string): Promise<string> {
    const comando = new GetObjectCommand({ Bucket: this.bucket(), Key: chave });

    return getSignedUrl(this.client(), comando, { expiresIn: VALIDADE_URL_DE_DOWNLOAD_SEGUNDOS });
  }

  async remover(chave: string): Promise<void> {
    await this.client().send(new DeleteObjectCommand({ Bucket: this.bucket(), Key: chave }));
  }

  private bucket(): string {
    if (!this.habilitado) {
      throw new ServiceUnavailableException('O armazenamento de anexos nao esta configurado.');
    }

    return this.config.getOrThrow<string>('S3_BUCKET');
  }

  private client(): S3Client {
    if (!this.habilitado) {
      throw new ServiceUnavailableException('O armazenamento de anexos nao esta configurado.');
    }

    return new S3Client({
      endpoint: this.config.getOrThrow<string>('S3_ENDPOINT'),
      region: this.config.get<string>('S3_REGION') ?? 'auto',
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('S3_ACCESS_KEY_ID'),
        secretAccessKey: this.config.getOrThrow<string>('S3_SECRET_ACCESS_KEY'),
      },
    });
  }
}
