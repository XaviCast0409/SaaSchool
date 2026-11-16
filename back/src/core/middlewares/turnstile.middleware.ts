import type { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env';
import { AppError } from '../errors/app-error';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Exige un token válido de Cloudflare Turnstile (campo `turnstileToken` del body) en formularios
 * públicos. Si TURNSTILE_SECRET_KEY no está configurada, no hace nada (desarrollo).
 */
export const requireTurnstile = async (request: Request, _response: Response, next: NextFunction): Promise<void> => {
  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) return next();

  const token = typeof request.body?.turnstileToken === 'string' ? request.body.turnstileToken : '';
  if (!token || token.length > 2048) {
    throw new AppError('Completa la verificación anti-spam antes de enviar.', 400);
  }

  let success = false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (request.ip) body.set('remoteip', request.ip);
    const res = await fetch(VERIFY_URL, { method: 'POST', body, signal: AbortSignal.timeout(5000) });
    const data = (await res.json()) as { success?: boolean };
    success = data.success === true;
  } catch (error) {
    console.error('[Turnstile] No se pudo verificar el token:', error);
    throw new AppError('No pudimos verificar el formulario. Inténtalo nuevamente en unos segundos.', 503);
  }
  if (!success) throw new AppError('La verificación anti-spam falló o expiró. Vuelve a intentarlo.', 400);
  next();
};
