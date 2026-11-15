import { describe, it, expect } from 'vitest';
import { buildPublicMediaUrl, isCurrentPublicMedia, parsePublicMediaUrl } from '../public-media.rules';

const school = '123e4567-e89b-42d3-a456-426614174000';
const file = '9b2f6c1e-1d2a-4c3b-8e4f-5a6b7c8d9e0f';
const other = '00000000-0000-4000-8000-000000000000';

describe('URL pública de logos y fotos de perfil', () => {
  it('arma la URL absoluta sin barra doble', () => {
    expect(buildPublicMediaUrl('https://api.colegio.pe/', 'logos', school, file)).toBe(
      `https://api.colegio.pe/api/public/media/logos/${school}/${file}`,
    );
  });

  it('lee de vuelta tipo, dueño y archivo', () => {
    expect(parsePublicMediaUrl(buildPublicMediaUrl('http://localhost:3000', 'avatars', school, file))).toEqual({
      kind: 'avatars',
      ownerId: school,
      fileId: file,
    });
  });

  it('ignora URLs externas o mal formadas', () => {
    expect(parsePublicMediaUrl('https://res.cloudinary.com/x/logo.png')).toBeNull();
    expect(parsePublicMediaUrl(`/api/public/media/logos/${school}/no-es-uuid`)).toBeNull();
    expect(parsePublicMediaUrl(null)).toBeNull();
  });

  it('solo reconoce la imagen vigente de ese dueño y de ese tipo', () => {
    const url = buildPublicMediaUrl('http://localhost:3000', 'logos', school, file);
    expect(isCurrentPublicMedia(url, 'logos', school, file)).toBe(true);
    expect(isCurrentPublicMedia(url, 'logos', school, other)).toBe(false);
    expect(isCurrentPublicMedia(url, 'logos', other, file)).toBe(false);
    expect(isCurrentPublicMedia(url, 'avatars', school, file)).toBe(false);
    expect(isCurrentPublicMedia('https://res.cloudinary.com/x/logo.png', 'logos', school, file)).toBe(false);
  });
});
