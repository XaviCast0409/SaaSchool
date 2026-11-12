# Prompt: arreglar los botones "Excel" de Reportes académicos y del Registro auxiliar

Eres un agente trabajando en el monorepo SaaSchool (back/ = Express + Prisma + exceljs, front/ = React 18 + Vite + TanStack Query + axios + sonner). Trabaja en la rama actual. No hagas push. Haz un solo commit al final solo si todo lo de "Verificación" pasa.

## Problema (ya diagnosticado, no lo vuelvas a investigar)

En la página **Académico → Reportes académicos** (`/academic/reports`, archivo `front/src/features/academic/pages/AcademicReportsPage.tsx`), pestaña **Consolidado**, el botón **Excel** no descarga nada y muestra el toast "No se pudo descargar el archivo.".

Causa: el frontend llama a URLs que **no existen** en el backend → **404**.

| Botón | El front llama a (MAL) | La ruta real del backend (BIEN) | Parámetros |
|---|---|---|---|
| Excel del Consolidado (`front/src/features/academic/pages/AcademicReportsPage.tsx`, ~línea 64) | `/academic/exports/consolidation.xlsx` | `GET /academic/consolidation/export` | `classroomId`, `period` (1-4 o `'FINAL'`) |
| Excel del Registro auxiliar (`front/src/features/academic/pages/GradebookPage.tsx`, ~línea 65) | `/academic/exports/gradebook.xlsx` | `GET /academic/gradebook/export` | `assignmentId`, `periodNumber` |

Las rutas reales están en `back/src/modules/academic/academic.routes.ts` (líneas `router.get('/gradebook/export', …)` y `router.get('/consolidation/export', …)`). Los generadores `buildConsolidationWorkbook` y `buildGradebookWorkbook` de `back/src/modules/academic/academic-excel.service.ts` **ya funcionan**: se probaron con los 6 salones × 5 periodos y los 63 cursos × 2 periodos del seed, 186 archivos, 0 errores. **No toques el backend.**

Además, el mensaje de error es genérico porque `downloadFile` usa `responseType: 'blob'`: cuando el servidor responde un error, `response.data` es un `Blob` y `apiErrorMessage` no puede leer su `message`.

El otro centro de reportes (`front/src/features/academic-reports/…`, el "Centro de Emisión de Reportes" con el botón verde "Generar Excel") **funciona bien** con los 10 reportes. No lo modifiques.

## Cambios exactos

### 1. `front/src/features/academic/pages/AcademicReportsPage.tsx`
Cambia la URL del botón Excel del consolidado:
```tsx
downloadFile('/academic/consolidation/export', { classroomId, period }, `consolidado-${data.classroom.grade}${data.classroom.section}-${period}.xlsx`)
```
- Mientras se descarga, el botón queda deshabilitado y muestra `Loader2` girando con el texto "Generando…". Usa un estado local `const [downloading, setDownloading] = useState(false)` y `await downloadFile(...)` dentro de `try/finally`.
- Si `classroomId` es `null`, no hagas nada.

### 2. `front/src/features/academic/pages/GradebookPage.tsx`
Cambia la URL del botón Excel del registro auxiliar:
```tsx
downloadFile('/academic/gradebook/export', { assignmentId: data.assignment.id, periodNumber: period }, `registro-${data.assignment.area.name}-p${period}.xlsx`)
```
Agrega el mismo estado de carga que en el punto 1.

### 3. `front/src/features/academic/api.ts`: función `downloadFile`
Reemplázala por esta versión:
- Devuelve `Promise<boolean>`: `true` si descargó, `false` si falló.
- Cuando el error trae un `Blob`, lee el JSON del servidor para mostrar su mensaje real.
- Revoca la URL del blob con un pequeño retraso; algunos navegadores cancelan la descarga si se revoca de inmediato.
- Limpia del nombre del archivo los caracteres que Windows no permite.

```ts
export async function downloadFile(url: string, params: Record<string, unknown>, filename: string): Promise<boolean> {
  try {
    const response = await api.get(url, { params, responseType: 'blob' });
    const blob = response.data as Blob;
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = filename.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '_');
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
    return true;
  } catch (e) {
    let message: string | undefined;
    const data = (e as { response?: { data?: unknown } })?.response?.data;
    if (data instanceof Blob) {
      try { message = JSON.parse(await data.text())?.message; } catch { /* respuesta no JSON */ }
    }
    toast.error(message || apiErrorMessage(e, 'No se pudo descargar el archivo.'));
    return false;
  }
}
```

### 4. Revisa que no queden URLs inventadas
Ejecuta `grep -rn "/academic/exports" front/src`. Debe dar **0 resultados**.

Revisa también cada llamada `downloadFile(` y `api.get('/academic/…')` en `front/src/features/academic/` y compárala con `back/src/modules/academic/academic.routes.ts`. Las rutas montan bajo `/api/academic`. Si encuentras otra URL que no exista en el backend, corrígela en el front y anótala en el resumen final.

## Verificación (obligatoria antes del commit)

1. `cd front && npx tsc --noEmit` sin errores, y `npm run build` OK.
2. Con back (puerto 3000) y front (5173) levantados, inicia sesión como `admin.pro@innova.edu.pe` / `Admin123!` (seed de prueba local) y comprueba:
   - **Reportes académicos → Consolidado**: el botón Excel descarga `consolidado-<grado><sección>-1.xlsx`. En la pestaña Network la petición es `GET /api/academic/consolidation/export?...` con respuesta **200** y `Content-Type` `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`. Prueba también con el periodo **"Calificativo final"** (incluye la columna Situación).
   - **Registro auxiliar de un curso** (Inicio académico → Avance → Abrir registro): el botón Excel descarga `registro-<área>-p<n>.xlsx`, con una hoja por competencia.
   - Abre ambos archivos en Excel o LibreOffice: no deben aparecer avisos de reparación. Las letras AD/A/B/C se ven con su color de fondo.
   - Fuerza un error (por ejemplo, cambia temporalmente el `classroomId` por un UUID inexistente desde DevTools): el toast debe mostrar el mensaje del servidor, no el genérico. Después revierte la prueba.
   - Como docente (`Teacher123!`, cualquier docente del seed con carga), el Excel de **su** registro auxiliar descarga bien.
3. `cd back && npx vitest run`: todo verde (no deberías haber tocado el back).

## Commit
Mensaje:
```
fix(reportes): botones Excel del consolidado y registro auxiliar apuntaban a rutas inexistentes (404)
```

## Resumen final que debes entregar
- Archivos cambiados.
- Las dos URLs corregidas.
- Cualquier otra URL corregida en el punto 4.
- El resultado de cada punto de verificación.
