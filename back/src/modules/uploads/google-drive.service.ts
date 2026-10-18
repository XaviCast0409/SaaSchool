import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { AppError } from '../../core/errors/app-error';

export interface UploadResult {
  fileId: string;
  downloadUrl: string;
  webViewLink?: string;
  storage: 'GOOGLE_DRIVE' | 'LOCAL';
}

export class GoogleDriveService {
  private driveClient: drive_v3.Drive | null = null;
  private folderId: string | null = null;

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

  /**
   * Sube un archivo directamente a Google Drive sin saturar el disco del servidor.
   * Asigna permisos públicos de lectura y genera el enlace de descarga directa en 1 clic.
   */
  public async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string
  ): Promise<UploadResult> {
    const targetFolderId = await this.getFolderId();

    if (!this.driveClient || !targetFolderId) {
      throw new AppError(
        'Google Drive no está configurado. Asegúrate de tener las credenciales y la carpeta SaaSchool compartida.',
        500
      );
    }

    const stream = Readable.from(fileBuffer);

    // 1. Crear el archivo en la carpeta compartida de Google Drive
    const response = await this.driveClient.files.create({
      requestBody: {
        name: originalName,
        parents: [targetFolderId],
      },
      media: {
        mimeType,
        body: stream,
      },
      fields: 'id, name, webViewLink, webContentLink',
    });

    const fileId = response.data.id;
    if (!fileId) {
      throw new AppError('Error al subir el archivo a Google Drive (ID no generado).', 500);
    }

    // 2. Asignar permiso público de lectura ('anyone - reader') para descarga directa en 1 clic
    try {
      await this.driveClient.permissions.create({
        fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    } catch (permError) {
      console.warn('Advertencia al asignar permisos públicos en Drive:', permError);
    }

    // 3. Enlace directo de descarga en 1 clic (sin pasar por el visor web de Drive)
    const directDownloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

    return {
      fileId,
      downloadUrl: directDownloadUrl,
      webViewLink: response.data.webViewLink || undefined,
      storage: 'GOOGLE_DRIVE',
    };
  }
}

export const googleDriveService = new GoogleDriveService();
