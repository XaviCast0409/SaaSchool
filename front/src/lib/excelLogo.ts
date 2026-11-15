import type ExcelJS from 'exceljs';
import { queryClient } from './queryClient';

const LOGO_HEIGHT_PX = 56;
const LOGO_MAX_WIDTH_PX = 140;

/** Logo del colegio activo, tomado de la caché de React Query (lo carga el layout al entrar). */
export function activeSchoolLogoUrl(): string | null {
  for (const [, data] of queryClient.getQueriesData<{ logoUrl?: string | null } | null>({ queryKey: ['school'] })) {
    if (data?.logoUrl) return data.logoUrl;
  }
  return null;
}

const toDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/**
 * Pone el logo del colegio en la esquina superior derecha de cada hoja, justo a la derecha de la
 * tabla, para no tapar ningún dato. Si no hay logo o no se puede descargar, el Excel sale igual.
 */
export async function addSchoolLogoToWorkbook(workbook: ExcelJS.Workbook, logoUrl: string | null = activeSchoolLogoUrl()): Promise<void> {
  if (!logoUrl) return;
  try {
    const res = await fetch(logoUrl);
    if (!res.ok) return;
    const blob = await res.blob();
    // Excel solo admite PNG, JPEG o GIF
    const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/jpeg' ? 'jpeg' : null;
    if (!extension) return;

    const bitmap = await createImageBitmap(blob);
    const width = Math.min(LOGO_MAX_WIDTH_PX, Math.round((bitmap.width / Math.max(1, bitmap.height)) * LOGO_HEIGHT_PX));
    bitmap.close();

    const imageId = workbook.addImage({ base64: await toDataUrl(blob), extension });
    for (const ws of workbook.worksheets) {
      ws.addImage(imageId, {
        tl: { col: Math.max(1, ws.columnCount), row: 0 },
        ext: { width, height: LOGO_HEIGHT_PX },
        editAs: 'oneCell',
      });
    }
  } catch {
    // Sin logo: el reporte sigue siendo válido
  }
}
