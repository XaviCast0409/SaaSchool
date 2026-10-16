import QRCode from 'qrcode';

export interface StudentQrData {
  id: string;
  studentName: string;
  documentId: string;
  studentCode?: string;
  grade: string;
  section: string;
  educationLevel: string;
  qrDataUrl?: string;
}

/**
 * Genera el Data URL (PNG en Base64) del código QR para un estudiante.
 * Utiliza el DNI del alumno (o su Código de Estudiante SIAGIE como fallback).
 * Configurado con Corrección de Errores Nivel M (15% de redundancia) y margen limpio de 1 módulo.
 */
export async function generateStudentQrCode(code: string, size = 300): Promise<string> {
  const safeCode = (code || '00000000').trim();
  try {
    return await QRCode.toDataURL(safeCode, {
      width: size,
      margin: 1,
      color: {
        dark: '#0f172a', // Slate 900 nítido
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.error('Error al generar código QR:', err);
    return '';
  }
}

/**
 * Descarga la imagen PNG del código QR de un alumno (ideal para WhatsApp).
 */
export function downloadQrPng(dataUrl: string, fileName: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `${fileName.replace(/[^a-zA-Z0-9_-]/g, '_')}_QR.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Imprime un elemento o contenedor específico mediante la ventana nativa del navegador.
 */
export function triggerPrint() {
  window.print();
}
