/**
 * Imágenes públicas de la plataforma: logo del colegio y foto de perfil del personal.
 *
 * Se guardan como URL absoluta para que cualquier <img> (panel, libretas impresas,
 * páginas públicas de ingreso y admisión) las muestre sin sesión ni enlaces firmados.
 * La URL incluye el id del dueño y el id del archivo (ambos UUID v4): solo se entrega
 * la imagen vigente de ese dueño, así que un id adivinado no abre otros archivos.
 */
export type PublicMediaKind = 'logos' | 'avatars';

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const MEDIA_URL = new RegExp(`/api/public/media/(logos|avatars)/(${UUID})/(${UUID})$`, 'i');

export const PUBLIC_IMAGE_MIME = /^image\/(png|jpeg|webp)$/;
export const PUBLIC_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

export const buildPublicMediaUrl = (baseUrl: string, kind: PublicMediaKind, ownerId: string, fileId: string): string =>
  `${baseUrl.replace(/\/$/, '')}/api/public/media/${kind}/${ownerId}/${fileId}`;

export const parsePublicMediaUrl = (
  url?: string | null,
): { kind: PublicMediaKind; ownerId: string; fileId: string } | null => {
  const match = url?.match(MEDIA_URL);
  if (!match) return null;
  return { kind: match[1].toLowerCase() as PublicMediaKind, ownerId: match[2].toLowerCase(), fileId: match[3].toLowerCase() };
};

/** ¿La URL guardada apunta exactamente a esta imagen de este dueño? */
export const isCurrentPublicMedia = (
  storedUrl: string | null | undefined,
  kind: PublicMediaKind,
  ownerId: string,
  fileId: string,
): boolean => {
  const parsed = parsePublicMediaUrl(storedUrl);
  return Boolean(parsed && parsed.kind === kind && parsed.ownerId === ownerId.toLowerCase() && parsed.fileId === fileId.toLowerCase());
};
