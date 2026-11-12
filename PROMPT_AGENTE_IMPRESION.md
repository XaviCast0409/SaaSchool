# Prompt: los PDF / impresiones salen con páginas duplicadas

Eres un agente trabajando en el monorepo SaaSchool. Esta tarea es solo de frontend: `front/` (React 18 + Vite + Tailwind + Radix + sonner).
- Trabaja en la rama actual.
- No hagas push.
- Haz un solo commit al final, y solo si pasa todo lo de "Verificación".
- No toques el backend.

## Problema (ya diagnosticado y reproducido; no lo vuelvas a investigar)

Al pulsar cualquier botón "Imprimir" / "Generar PDF" de la app, el PDF sale con más páginas de las necesarias. Ejemplo: Carnet → Imprimir → Guardar como PDF da **2 páginas con el mismo carnet**.

### Causa

Todas las impresiones usan `window.print()` sobre la página completa e intentan ocultar el resto con CSS. Esa técnica falla por tres motivos:

1. **`visibility: hidden` oculta pero no quita espacio.** La página que está detrás del modal (por ejemplo, la lista de alumnos) sigue midiendo lo mismo. Si mide 2 hojas A4, el PDF tiene 2 hojas.
2. **El navegador repite en cada hoja impresa los elementos con `position: fixed`.** Pasa con el carnet individual (`#printable-single-card-wrap { position: fixed }`) y con todos los modales, que son `fixed inset-0`. Por eso el mismo contenido aparece en la hoja 1 y otra vez en la hoja 2.
3. Varios modales (recibo, cierre de caja, constancia, ficha) ni siquiera ocultan la página de fondo. Imprimen la página de detrás más el modal repetido.

Esto se reprodujo con Edge en modo headless:

| Versión | Resultado |
|---|---|
| Técnica actual: `body * { visibility:hidden }` + tarjeta `position:fixed` sobre una página alta | PDF de 2 páginas, el carnet en ambas |
| Técnica nueva de abajo | PDF de 1 página |

### Puntos de impresión afectados

Revisa y migra **todos**. Antes de empezar, búscalos con `grep -rn "window.print\|triggerPrint\|print-area\|visibility: hidden" front/src`.

| # | Archivo | Qué imprime |
|---|---|---|
| 1 | `src/features/students/components/StudentQrCardModal.tsx` | Carnet QR individual |
| 2 | `src/features/students/components/SectionQrCardsModal.tsx` | Carnets de toda la sección (hojas A4 de 2×4) |
| 3 | `src/features/payments/components/ReceiptModal.tsx` | Recibo interno de pago |
| 4 | `src/features/payments/components/DailyCashCloseModal.tsx` | Cierre de caja diario |
| 5 | `src/features/students/components/StudentCertificateModal.tsx` | Constancia / certificado |
| 6 | `src/features/students/components/StudentFichaModal.tsx` | Ficha del alumno (tiene un modal anidado, ~línea 522) |
| 7 | `src/components/ui/TemporaryCredentialsDialog.tsx` | Credenciales temporales (usa `.print-area`) |
| 8 | `src/features/academic/pages/ReportCardsPrintPage.tsx` | Libretas del aula |
| 9 | `src/features/academic-reports/pages/AcademicReportsPage.tsx` (`handleGeneratePdf` + contenedor `hidden print:block`) y `components/shared/ReportActionToolbar.tsx` | "Otros reportes" → Generar PDF |
| 10 | `src/features/attendance/utils/studentQrUtils.ts` (`triggerPrint`) | Revisa quién lo usa y migra a esos usuarios |

## Solución: imprimir solo el documento, en un contenedor aparte

La idea es renderizar el documento a imprimir **solo mientras se imprime**, dentro de un portal `#print-root` que es hijo directo de `<body>`. En impresión se ocultan con `display: none` (no `visibility`) todos los demás hijos de `<body>`:
- `#root`, con la página, los modales y los toasts;
- los portales de Radix.

Así la altura impresa es solo la del documento y no queda nada `fixed` que se repita.

### 1. Crear `front/src/lib/print/PrintPortal.tsx`

```tsx
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const ROOT_ID = 'print-root';

function getPrintRoot(): HTMLElement {
  let el = document.getElementById(ROOT_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = ROOT_ID;
    document.body.appendChild(el);
  }
  return el;
}

/** Renderiza el documento imprimible fuera de #root. Móntalo SOLO mientras isPrinting sea true. */
export function PrintPortal({ children }: { children: ReactNode }) {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const el = getPrintRoot();
    document.body.classList.add('has-print-portal');
    setRoot(el);
    return () => document.body.classList.remove('has-print-portal');
  }, []);
  return root ? createPortal(<div className="print-document">{children}</div>, root) : null;
}
```

### 2. Crear `front/src/lib/print/usePrint.ts`

```ts
import { useCallback, useEffect, useRef, useState } from 'react';

interface PrintOptions {
  /** Ej.: 'A4 portrait', 'A4 landscape', '80mm 200mm' */
  pageSize?: string;
  margin?: string;
  /** Nombre sugerido del PDF (Chrome usa document.title) */
  title?: string;
}

export function usePrint({ pageSize = 'A4 portrait', margin = '10mm', title }: PrintOptions = {}) {
  const [isPrinting, setIsPrinting] = useState(false);
  const busy = useRef(false);

  const print = useCallback(() => {
    if (busy.current) return; // evita doble clic
    busy.current = true;
    setIsPrinting(true);
  }, []);

  useEffect(() => {
    if (!isPrinting) return;
    let cancelled = false;
    const style = document.createElement('style');
    style.id = 'print-page-style';
    style.textContent = `@page { size: ${pageSize}; margin: ${margin}; }`;
    document.head.appendChild(style);
    const prevTitle = document.title;
    if (title) document.title = title;

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      style.remove();
      document.title = prevTitle;
      busy.current = false;
      setIsPrinting(false);
    };

    (async () => {
      // esperar a que el portal pinte, a que carguen las imágenes (QR, logos) y las fuentes
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('#print-root img'));
      await Promise.all(imgs.map((img) => (img.complete ? null : img.decode().catch(() => null))));
      await (document as Document & { fonts?: FontFaceSet }).fonts?.ready;
      if (cancelled) return;
      window.addEventListener('afterprint', finish, { once: true });
      window.print();
    })();

    return () => {
      cancelled = true;
      window.removeEventListener('afterprint', finish);
      style.remove();
      document.title = prevTitle;
    };
  }, [isPrinting, pageSize, margin, title]);

  return { print, isPrinting };
}
```

Importante: `finish` se ejecuta **solo** con el evento `afterprint` (Chrome, Edge, Firefox y Safari lo soportan). No lo llames justo después de `window.print()`; eso permite verificar con `page.pdf()`, como se explica abajo.

Exporta ambos desde `front/src/lib/print/index.ts`.

### 3. Reemplazar el bloque `@media print` de `front/src/index.css`

Borra las reglas de `.print-area` y `body:has(.print-area) *`, y deja esto:

```css
#print-root { display: none; }

@media print {
  body.has-print-portal > *:not(#print-root) { display: none !important; }
  body.has-print-portal #print-root { display: block !important; }
  body { background: #fff !important; }
  #print-root {
    color: #000;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .no-print { display: none !important; }
  .break-after-page { break-after: page; }
  .break-after-page:last-child { break-after: auto; }
  .avoid-break { break-inside: avoid; }
  @page { size: A4; margin: 12mm; } /* por defecto; usePrint lo sobrescribe */
}
```

### 4. Migrar cada punto de impresión con el mismo patrón

```tsx
const { print, isPrinting } = usePrint({ pageSize: 'A4 portrait', title: `Carnet - ${studentName}` });
// …
<Button onClick={print} disabled={isPrinting || !qrDataUrl}>Imprimir carnet</Button>
{isPrinting && (
  <PrintPortal>
    <CarnetDocument {...props} />
  </PrintPortal>
)}
```

Reglas:
- Extrae el contenido imprimible a un componente (por ejemplo `CarnetDocument`, `ReceiptDocument`, `FichaDocument`). Úsalo **en la vista previa del modal y dentro del `PrintPortal`**, para no duplicar marcado.
- Borra en cada archivo:
  - los bloques `<style>{`@media print { body * { visibility: hidden } … }`}</style>`;
  - los `position: fixed/absolute` de impresión;
  - los ids `#printable-…`;
  - el uso de `.print-area`.
- Las clases `print:hidden` del modal ya no hacen falta, porque el modal entero queda oculto. Puedes dejarlas.
- Dentro del documento impreso no uses `position: fixed`, `h-screen`, `min-h-screen`, `overflow-hidden` ni `max-h-*`, porque cortan o repiten contenido.
- Lo que deba ocupar una hoja propia lleva `break-after-page`. La última hoja no lleva salto, para evitar una hoja en blanco al final.
- **Carnet individual (1):** tamaño real del carnet, 88 mm de ancho, centrado arriba en una sola hoja A4 vertical.
- **Carnets por sección (2):** conserva la rejilla de 2×4 por hoja A4 (`.a4-print-page`, 94 mm × 63 mm) pasándola dentro del documento. Cada `.a4-print-page` lleva `break-after-page`, excepto la última. Con N alumnos deben salir exactamente `ceil(N / 8)` hojas.
- **Recibo (3):** si el recibo está pensado para ticketera, usa un `pageSize` acorde. Si no, A4 vertical. Debe salir en 1 hoja.
- **Ficha (6):** el modal anidado no debe montar otro `PrintPortal` mientras el principal imprime. Solo debe haber **un** `PrintPortal` montado a la vez.
- **Credenciales temporales (7):** el diálogo de Radix vive en su propio portal. El documento impreso va en `PrintPortal`, no dentro del diálogo.
- **Libretas (8):** usa `usePrint({ pageSize: 'A4 portrait' })` y renderiza todas las libretas dentro del `PrintPortal`. Cada libreta lleva `break-after-page` y la última no. Si la libreta tiene un orden de impresión propio, respétalo.
- **"Otros reportes" (9):**
  - En `handleGeneratePdf`, primero haz el `refetch` del reporte elegido y después llama a `print()`.
  - Usa `pageSize` según `pdfOrientation` (`'A4 landscape'` o `'A4 portrait'`, margen 8 mm) y el `title` que hoy arma con `document.title`.
  - Borra la inyección manual de `#report-dynamic-print-style` y el truco de `setTimeout` para restaurar el título.
  - Mueve el contenedor `hidden print:block` a `{isPrinting && <PrintPortal>…</PrintPortal>}`.
  - Revisa si los botones de `ReportActionToolbar` se usan en pantalla. Si se usan, migra su `window.print()` al mismo hook. Si no, elimina ese botón.
- Al terminar, `grep -rn "window.print" front/src` solo debe encontrar `src/lib/print/usePrint.ts`, y `grep -rn "visibility: hidden" front/src` no debe encontrar reglas de impresión.

## Verificación (obligatoria antes del commit)

1. `cd front && npx tsc --noEmit` sin errores, y `npm run build` OK.
2. **Conteo automático de páginas.** Usa Edge, que ya está instalado en Windows. Trabaja en una carpeta temporal **fuera del repo** (no agregues dependencias al proyecto):
   - Instala `puppeteer-core` ahí.
   - Lanza Edge con `executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'`.
   - Con back (puerto 3000) y front (5173) levantados, inicia sesión en `http://localhost:5173/login` como `admin.pro@innova.edu.pe` / `Admin123!` (seed de prueba local).
   - Por cada punto de impresión:
     1. Navega a la pantalla y abre el modal.
     2. Ejecuta `await page.evaluate(() => { window.print = () => {}; })`.
     3. Pulsa el botón de imprimir.
     4. Espera a que `#print-root` tenga contenido (`page.waitForFunction(() => document.querySelector('#print-root')?.childElementCount)`).
     5. Genera `await page.pdf({ preferCSSPageSize: true })`.
     6. Cuenta las páginas con la regex `/\/Type\s*\/Page[^s]/g` sobre el buffer.
     7. Por último, ejecuta `page.evaluate(() => window.dispatchEvent(new Event('afterprint')))` y comprueba que `#print-root` queda vacío.

   **Páginas esperadas:**

   | Documento | Páginas |
   |---|---|
   | Carnet individual | 1 |
   | Carnets de 3.° Primaria "A" | `ceil(alumnos / 8)` (con el seed, 22 alumnos → 3) |
   | Recibo | 1 |
   | Cierre de caja | 1, salvo que el contenido real no quepa |
   | Constancia | 1 |
   | Credenciales temporales | 1 |
   | Ficha | La que exija su contenido, sin repetir hojas ni hoja en blanco al final |
   | Libretas del aula | Una (o las páginas propias de cada libreta) por alumno, sin hojas en blanco |
   | Otros reportes → Consolidado (0021) y Padrón (0011) | Sin hojas repetidas ni hoja en blanco final, en horizontal y en vertical |

   Abre al menos el PDF del carnet, el de carnets por sección y el de una libreta, y revisa visualmente que no haya contenido de la página de fondo, ni toasts, ni la barra lateral, y que los QR aparezcan.
3. **Prueba manual** en el navegador real: Carnet → Imprimir → en la vista previa de Chrome/Edge el contador debe decir **1 hoja**. Al cerrar el diálogo de impresión, el modal sigue abierto y funcional, y se puede volver a imprimir.
4. Modo oscuro: el PDF sale con fondo blanco y texto negro.

## Commit

Mensaje:
```
fix(impresion): imprimir solo el documento en un portal aparte; elimina páginas duplicadas en carnets, recibos, constancias, fichas, libretas y reportes
```

## Resumen final que debes entregar

- Archivos creados y cambiados.
- La tabla de páginas obtenidas por documento (esperado vs. obtenido).
- Cualquier punto de impresión adicional que hayas encontrado.
