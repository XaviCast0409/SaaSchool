import { z, ZodErrorMap, ZodIssueCode, defaultErrorMap } from 'zod';

/**
 * Mapeo de errores de Zod al español para toda la aplicación backend.
 * Asegura que ninguna respuesta de validación 422 devuelva textos en inglés como
 * "Required", "Invalid enum value", etc.
 */
export const zodEsErrorMap: ZodErrorMap = (issue, ctx) => {
  let message: string;

  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === 'undefined') {
        message = 'Este campo es obligatorio.';
      } else if (issue.expected === 'number') {
        message = 'Se esperaba un número válido.';
      } else if (issue.expected === 'string') {
        message = 'Se esperaba un texto.';
      } else if (issue.expected === 'boolean') {
        message = 'Se esperaba verdadero o falso.';
      } else if (issue.expected === 'date') {
        message = 'Se esperaba una fecha válida.';
      } else {
        message = `Se esperaba ${issue.expected}, pero se recibió ${issue.received}.`;
      }
      break;

    case ZodIssueCode.invalid_enum_value:
      message = `Valor no válido. Opciones permitidas: ${issue.options.map((v) => `«${v}»`).join(', ')}.`;
      break;

    case ZodIssueCode.too_small:
      if (issue.type === 'string') {
        if (issue.exact) {
          message = `Debe tener exactamente ${issue.minimum} caracteres.`;
        } else if (issue.minimum === 1) {
          message = 'Este campo no puede estar vacío.';
        } else {
          message = `Debe tener al menos ${issue.minimum} caracteres.`;
        }
      } else if (issue.type === 'number') {
        message = issue.inclusive
          ? `Debe ser mayor o igual a ${issue.minimum}.`
          : `Debe ser mayor a ${issue.minimum}.`;
      } else if (issue.type === 'array') {
        message = `Debe seleccionar al menos ${issue.minimum} elemento(s).`;
      } else {
        message = 'Valor demasiado pequeño.';
      }
      break;

    case ZodIssueCode.too_big:
      if (issue.type === 'string') {
        if (issue.exact) {
          message = `Debe tener exactamente ${issue.maximum} caracteres.`;
        } else {
          message = `No puede tener más de ${issue.maximum} caracteres.`;
        }
      } else if (issue.type === 'number') {
        message = issue.inclusive
          ? `Debe ser menor o igual a ${issue.maximum}.`
          : `Debe ser menor a ${issue.maximum}.`;
      } else if (issue.type === 'array') {
        message = `No puede seleccionar más de ${issue.maximum} elemento(s).`;
      } else {
        message = 'Valor demasiado grande.';
      }
      break;

    case ZodIssueCode.invalid_string:
      if (issue.validation === 'email') {
        message = 'Correo electrónico no válido.';
      } else if (issue.validation === 'url') {
        message = 'URL no válida.';
      } else if (issue.validation === 'uuid') {
        message = 'Identificador no válido.';
      } else if (issue.validation === 'regex') {
        message = 'Formato no válido.';
      } else {
        message = 'Texto no válido.';
      }
      break;

    case ZodIssueCode.invalid_date:
      message = 'Fecha no válida.';
      break;

    case ZodIssueCode.custom:
      message = ctx.defaultError;
      break;

    default:
      message = defaultErrorMap(issue, ctx).message;
      break;
  }

  return { message };
};

// Registrar el mapa globalmente en Zod
z.setErrorMap(zodEsErrorMap);

