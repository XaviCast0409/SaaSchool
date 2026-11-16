import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/axios', () => ({ api: { get: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

import { extractGoogleDriveId, getInternalFileId, isGoogleDriveUrl, isImageUrl, isInternalFileUrl } from '../fileUrls';

describe('enlaces de archivos', () => {
  it('extrae el id de Google Drive en sus dos formatos', () => {
    expect(extractGoogleDriveId('https://drive.google.com/file/d/AbC_123-x/view?usp=sharing')).toBe('AbC_123-x');
    expect(extractGoogleDriveId('https://drive.google.com/open?id=XyZ789')).toBe('XyZ789');
    expect(extractGoogleDriveId('https://ejemplo.com/archivo.pdf')).toBeNull();
    expect(isGoogleDriveUrl('https://docs.google.com/document/d/1')).toBe(true);
  });

  it('reconoce los archivos guardados en la plataforma (/api/files/<uuid>)', () => {
    const id = '123e4567-e89b-12d3-a456-426614174000';
    expect(getInternalFileId(`/api/files/${id}`)).toBe(id);
    expect(isInternalFileUrl(`/api/files/${id}`)).toBe(true);
    expect(getInternalFileId(`/api/files/${id}/content`)).toBeNull();
    expect(getInternalFileId('https://otro.com/api/files/x')).toBeNull();
  });

  it('detecta imágenes por el nombre del archivo o la URL', () => {
    expect(isImageUrl(null, 'Foto.JPG')).toBe(true);
    expect(isImageUrl('/x/y.webp')).toBe(true);
    expect(isImageUrl('/x/y.pdf')).toBe(false);
  });
});
