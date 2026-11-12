import { Router, Request, Response } from 'express';
import { getSchoolNow } from '../../utils/timezone.util';
import { addDays } from '../automations/automation.rules';
import { collectCalendar, viewerFromFeedToken } from './calendar.service';
import { buildIcs } from './ics';

/**
 * Suscripción pública al calendario en formato .ics.
 * RUTA PÚBLICA INTENCIONAL: Google Calendar y el iPhone no pueden enviar el token de sesión,
 * por eso el acceso se valida con una firma HMAC personal incluida en la URL, que se invalida
 * al cambiar la contraseña. Solo expone el calendario de esa persona (sin datos de otros alumnos).
 */
export const calendarFeedRouter = Router();

calendarFeedRouter.get('/:token.ics', async (req: Request, res: Response) => {
  const resolved = await viewerFromFeedToken(String(req.params.token));
  if (!resolved) {
    res.status(404).type('text/plain').send('Calendario no encontrado.');
    return;
  }
  const today = getSchoolNow().dateStr;
  // Ventana de 30 días hacia atrás y ~6 meses hacia adelante, en tramos de 3 meses
  const ranges: Array<[string, string]> = [
    [addDays(today, -30), addDays(today, 60)],
    [addDays(today, 61), addDays(today, 150)],
  ];
  const items = (await Promise.all(ranges.map(([f, t]) => collectCalendar(resolved.viewer, f, t)))).flat();
  const ics = buildIcs(
    resolved.schoolName,
    items.map((i) => ({
      uid: `${i.kind}-${i.id}@saaschool`,
      title: i.studentName ? `${i.title} · ${i.studentName}` : i.title,
      description: i.description ?? null,
      location: i.location ?? null,
      date: i.date,
      endDate: i.endDate ?? null,
      startTime: i.kind === 'HOMEWORK' ? null : i.startTime ?? null,
      endTime: i.endTime ?? null,
    })),
  );
  res
    .status(200)
    .set('Content-Type', 'text/calendar; charset=utf-8')
    .set('Content-Disposition', 'inline; filename="calendario-escolar.ics"')
    .set('Cache-Control', 'private, max-age=900')
    .send(ics);
});
