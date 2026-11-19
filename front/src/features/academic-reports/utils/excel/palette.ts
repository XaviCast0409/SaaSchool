export const PALETTE = {
  headerBg: 'FF1E3A8A', // Azul Marino Institucional Oscuro
  headerText: 'FFFFFFFF', // Blanco
  subHeaderBg: 'FFDBEAFE', // Azul Hielo Suave (Ice Blue)
  subHeaderText: 'FF1E3A8A', // Azul Marino
  infoBg: 'FFF8FAFC', // Gris Pizarra Muy Suave
  infoText: 'FF334155', // Pizarra Oscuro
  tableHeaderBg: 'FFF1F5F9', // Fondo Cabecera Secundaria
  tableHeaderText: 'FF0F172A',
  zebraBg: 'FFF8FAFC', // Cebra fila impar
  white: 'FFFFFFFF',
  borderLight: 'FFCBD5E1', // Gris Borde Cuadrícula
  borderDark: 'FF94A3B8', // Borde Cabeceras
  gradeFail: 'FFDC2626', // Rojo para notas desaprobadas (< 10.5)
  gradePass: 'FF1E3A8A', // Azul para notas aprobadas
  tercioSup: 'FF15803D', // Verde Tercio Superior
  tercioMed: 'FFB45309', // Ámbar Tercio Medio
  tercioInf: 'FF64748B', // Pizarra Tercio Inferior
};

export const BORDERS = {
  thin: {
    top: { style: 'thin' as const, color: { argb: PALETTE.borderLight } },
    left: { style: 'thin' as const, color: { argb: PALETTE.borderLight } },
    bottom: { style: 'thin' as const, color: { argb: PALETTE.borderLight } },
    right: { style: 'thin' as const, color: { argb: PALETTE.borderLight } },
  },
  header: {
    top: { style: 'thin' as const, color: { argb: PALETTE.borderDark } },
    left: { style: 'thin' as const, color: { argb: PALETTE.borderDark } },
    bottom: { style: 'medium' as const, color: { argb: PALETTE.headerBg } },
    right: { style: 'thin' as const, color: { argb: PALETTE.borderDark } },
  },
  doubleBottom: {
    top: { style: 'thin' as const, color: { argb: PALETTE.borderLight } },
    left: { style: 'thin' as const, color: { argb: PALETTE.borderLight } },
    bottom: { style: 'double' as const, color: { argb: PALETTE.tableHeaderText } },
    right: { style: 'thin' as const, color: { argb: PALETTE.borderLight } },
  },
};

/**
 * Obtiene la fecha y hora actual formateada según el estándar peruano de Cubicol
 */
export const getFormattedDateTime = () => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('es-PE', {
    timeZone: 'America/Lima',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return { dateStr, timeStr };
};
