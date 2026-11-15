import fs from 'fs';
import type { Readable } from 'stream';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { env } from '../../config/env';
import { AppError } from '../../core/errors/app-error';
import { trashKeyFor } from './storage-provider.rules';
import { createR2Client, readR2Config } from './r2-client';

/**
 * Cloudflare R2 mediante la API compatible con S3.
 * El bucket es PRIVADO: los archivos se entregan siempre a través de la API
 * (/api/files/:id/content con firma), nunca con URL pública del bucket.
 */
export class R2StorageService {
  private client: S3Client | null = null;
  private readonly config = readR2Config(env);
  private readonly bucket = this.config?.bucket ?? '';

  isConfigured(): boolean {
    return this.config !== null;
  }

  private getClient(): S3Client {
    if (!this.config) throw new AppError('El almacenamiento de archivos (R2) no está configurado.', 503);
    if (!this.client) this.client = createR2Client(this.config);
    return this.client;
  }

  /** Sube el archivo temporal con la clave indicada. */
  async upload(input: { tempPath: string; objectKey: string; mimeType: string; size: number }): Promise<void> {
    try {
      await this.getClient().send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: input.objectKey,
          Body: fs.createReadStream(input.tempPath),
          ContentLength: input.size,
          ContentType: input.mimeType,
        }),
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('[R2] Error al subir', input.objectKey, error);
      throw new AppError('No se pudo guardar el archivo. Intenta nuevamente en unos minutos.', 502);
    }
  }

  async getStream(objectKey: string): Promise<NodeJS.ReadableStream> {
    try {
      const response = await this.getClient().send(new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }));
      if (!response.Body) throw new AppError('Archivo no disponible.', 404);
      return response.Body as Readable;
    } catch (error) {
      if (error instanceof AppError) throw error;
      const name = (error as { name?: string }).name;
      if (name === 'NoSuchKey' || name === 'NotFound') throw new AppError('Archivo no disponible.', 404);
      console.error('[R2] Error al leer', objectKey, error);
      throw new AppError('No se pudo obtener el archivo. Intenta nuevamente en unos minutos.', 502);
    }
  }

  /**
   * "Papelera": copia el objeto a papelera/<clave> y borra el original.
   * Una regla de ciclo de vida del bucket elimina papelera/ a los 30 días (ver DEPLOY.md).
   */
  async moveToTrash(objectKey: string): Promise<void> {
    const client = this.getClient();
    await client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        Key: trashKeyFor(objectKey),
        CopySource: `${this.bucket}/${objectKey.split('/').map(encodeURIComponent).join('/')}`,
      }),
    );
    await client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }));
  }

  /** Borrado definitivo (lo usan los scripts de diagnóstico). */
  async deleteObject(objectKey: string): Promise<void> {
    await this.getClient().send(new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }));
  }

  /** Verifica credenciales y acceso al bucket. */
  async checkBucket(): Promise<void> {
    await this.getClient().send(new HeadBucketCommand({ Bucket: this.bucket }));
  }
}

export const r2StorageService = new R2StorageService();
