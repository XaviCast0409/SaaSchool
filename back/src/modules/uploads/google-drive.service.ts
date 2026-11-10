// eslint-disable-next-line @typescript-eslint/no-var-requires
const { google } = require('googleapis');
import type { drive_v3 } from 'googleapis/build/src/apis/drive';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { AppError } from '../../core/errors/app-error';

export class GoogleDriveService {
  private driveClient: drive_v3.Drive | null = null;
  private folderId: string | null = null;
  private folderCache = new Map<string, string>();

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    try {
      dotenv.config();
      this.folderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() || null;

      // 1. Prioridad: Autenticación OAuth2 (Cuenta personal / empresarial con 5TB)
      const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
      const refreshToken = process.env.GOOGLE_REFRESH_TOKEN?.trim();

      if (clientId && clientSecret && refreshToken) {
        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
        oauth2Client.setCredentials({ refresh_token: refreshToken });
        this.driveClient = google.drive({ version: 'v3', auth: oauth2Client });
        console.log('✅ GoogleDriveService autenticado con OAuth2 (Cuenta 5TB)');
        return;
      }

      // 2. Ruta del archivo JSON de la Service Account (busca google-credentials.json.json o google-credentials.json)
      const possiblePaths = [
        process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim(),
        path.join(process.cwd(), 'google-credentials.json.json'),
        path.join(process.cwd(), 'google-credentials.json'),
      ].filter(Boolean) as string[];

      let credentialsPath: string | null = null;
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          credentialsPath = p;
          break;
        }
      }

      let auth: any = null;

      if (credentialsPath) {
        auth = new google.auth.GoogleAuth({
          keyFile: credentialsPath,
          scopes: ['https://www.googleapis.com/auth/drive'],
        });
        console.log('✅ GoogleDriveService autenticado con archivo:', credentialsPath);
      } else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        // En caso de que se pase el JSON completo como string en una variable de entorno
        const parsedCredentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        auth = new google.auth.GoogleAuth({
          credentials: parsedCredentials,
          scopes: ['https://www.googleapis.com/auth/drive'],
        });
      }

      if (auth) {
        this.driveClient = google.drive({ version: 'v3', auth });
      }
    } catch (error) {
      console.warn('⚠️ GoogleDriveService no pudo inicializarse:', error);
      this.driveClient = null;
    }
  }

  public async getFolderId(): Promise<string | null> {
    if (this.folderId) return this.folderId;
    if (!this.driveClient) return null;

    try {
      const res = await this.driveClient.files.list({
        q: "mimeType = 'application/vnd.google-apps.folder' and name = 'SaaSchool' and trashed = false",
        fields: 'files(id, name)',
      });
      if (res.data.files && res.data.files.length > 0) {
        this.folderId = res.data.files[0].id || null;
      }
    } catch (e) {
      console.warn('No se pudo autodescubrir la carpeta SaaSchool en Google Drive:', e);
    }
    return this.folderId;
  }

  public isConfigured(): boolean {
    if (!this.driveClient) {
      this.initialize();
    }
    return Boolean(this.driveClient);
  }

  private async ensureFolder(parentId: string, name: string): Promise<string> {
    const cacheKey = `${parentId}/${name}`;
    const cached = this.folderCache.get(cacheKey);
    if (cached) return cached;
    if (!this.driveClient) throw new AppError('Google Drive no está configurado.', 503);

    const safeName = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const existing = await this.driveClient.files.list({
      q: `'${parentId}' in parents and name = '${safeName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    let folderId = existing.data.files?.[0]?.id ?? null;
    if (!folderId) {
      const created = await this.driveClient.files.create({
        requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
        fields: 'id',
        supportsAllDrives: true,
      });
      folderId = created.data.id ?? null;
    }
    if (!folderId) throw new AppError('No se pudo crear la carpeta en Google Drive.', 500);
    this.folderCache.set(cacheKey, folderId);
    return folderId;
  }

  /** Sube un archivo PRIVADO (sin permisos públicos) dentro de /<raíz>/<segmentos...>. Devuelve el fileId de Drive. */
  public async uploadPrivateFile(input: {
    tempPath: string;
    fileName: string;
    mimeType: string;
    folderPath: string[];
  }): Promise<string> {
    const rootId = await this.getFolderId();
    if (!this.driveClient || !rootId) throw new AppError('Google Drive no está configurado.', 503);

    let parentId = rootId;
    for (const segment of input.folderPath) {
      parentId = await this.ensureFolder(parentId, segment);
    }

    const response = await this.driveClient.files.create({
      requestBody: { name: input.fileName, parents: [parentId] },
      media: { mimeType: input.mimeType, body: fs.createReadStream(input.tempPath) },
      fields: 'id',
      supportsAllDrives: true,
    });
    if (!response.data.id) throw new AppError('Error al subir el archivo a Google Drive.', 502);
    return response.data.id;
  }

  public async getFileStream(fileId: string): Promise<NodeJS.ReadableStream> {
    if (!this.driveClient) throw new AppError('Google Drive no está configurado.', 503);
    const response = await this.driveClient.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'stream' },
    );
    return response.data as unknown as NodeJS.ReadableStream;
  }

  /** Envía el archivo a la papelera de Drive (recuperable durante 30 días). */
  public async trashFile(fileId: string): Promise<void> {
    if (!this.driveClient) return;
    await this.driveClient.files.update({ fileId, requestBody: { trashed: true }, supportsAllDrives: true });
  }

  public async getFileMetadata(fileId: string): Promise<{ name: string; mimeType: string; size: number; ownedByMe: boolean } | null> {
    if (!this.driveClient) return null;
    try {
      const response = await this.driveClient.files.get({
        fileId,
        fields: 'name, mimeType, size, ownedByMe',
        supportsAllDrives: true,
      });
      return {
        name: response.data.name ?? 'archivo',
        mimeType: response.data.mimeType ?? 'application/octet-stream',
        size: Number(response.data.size ?? 0),
        ownedByMe: Boolean(response.data.ownedByMe),
      };
    } catch {
      return null;
    }
  }

  /** Elimina cualquier permiso público ("anyone") del archivo. */
  public async revokePublicAccess(fileId: string): Promise<number> {
    if (!this.driveClient) return 0;
    const permissions = await this.driveClient.permissions.list({
      fileId,
      fields: 'permissions(id,type)',
      supportsAllDrives: true,
    });
    let revoked = 0;
    for (const permission of permissions.data.permissions ?? []) {
      if (permission.type === 'anyone' && permission.id) {
        await this.driveClient.permissions.delete({ fileId, permissionId: permission.id, supportsAllDrives: true });
        revoked++;
      }
    }
    return revoked;
  }
}

export const googleDriveService = new GoogleDriveService();
