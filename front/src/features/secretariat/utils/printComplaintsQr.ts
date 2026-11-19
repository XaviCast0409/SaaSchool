import QRCode from 'qrcode';
import { toast } from 'sonner';

/** Abre una hoja lista para imprimir con el QR del Libro de Reclamaciones (para colocar junto al aviso). */
export const printComplaintsQr = async (url: string, schoolName: string): Promise<void> => {
  const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 480 });
  const win = window.open('', '_blank', 'width=720,height=900');
  if (!win) {
    toast.error('Permite las ventanas emergentes para imprimir el QR.');
    return;
  }
  const esc = (t: string) =>
    t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
  win.document
    .write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Libro de Reclamaciones - ${esc(schoolName)}</title>
    <style>body{font-family:system-ui,sans-serif;text-align:center;padding:40px;color:#111}h1{font-size:28px;margin:0 0 8px}p{margin:6px 0}img{width:320px;height:320px;margin:24px auto;display:block}small{color:#555;word-break:break-all}</style>
    </head><body><h1>Libro de Reclamaciones</h1><p>${esc(schoolName)}</p><img src="${dataUrl}" alt="Código QR"><p>Escanee el código para registrar su reclamo o queja.</p><small>${esc(url)}</small>
    <script>window.onload=function(){window.print()}</script></body></html>`);
  win.document.close();
};
