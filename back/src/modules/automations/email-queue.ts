import { env } from '../../config/env';
import { sendEmail, type EmailOptions } from '../../utils/notification.util';
import { getSchoolNow } from '../../utils/timezone.util';

/**
 * Cola de correos en memoria: envía de uno en uno con pausa entre envíos y un tope diario,
 * para no superar el límite de Gmail (~500 destinatarios al día) ni ser marcado como spam.
 * Si se alcanza el tope, el correo se descarta (la notificación en la app y el push sí llegan).
 */
const GAP_MS = 1500;

let queue: EmailOptions[] = [];
let processing = false;
let sentToday = 0;
let counterDate = '';

function resetCounterIfNewDay(): void {
  const today = getSchoolNow().dateStr;
  if (today !== counterDate) {
    counterDate = today;
    sentToday = 0;
  }
}

export function enqueueEmail(options: EmailOptions): boolean {
  resetCounterIfNewDay();
  if (sentToday + queue.length >= env.MAIL_DAILY_LIMIT) {
    console.warn(`[EmailQueue] Tope diario de ${env.MAIL_DAILY_LIMIT} correos alcanzado; se omite el correo a ${options.to}.`);
    return false;
  }
  queue.push(options);
  void processQueue();
  return true;
}

async function processQueue(): Promise<void> {
  if (processing) return;
  processing = true;
  try {
    while (queue.length > 0) {
      const next = queue.shift()!;
      resetCounterIfNewDay();
      const ok = await sendEmail(next);
      if (ok) sentToday++;
      if (queue.length > 0) await new Promise((r) => setTimeout(r, GAP_MS));
    }
  } finally {
    processing = false;
  }
}

export function emailQueueStats() {
  resetCounterIfNewDay();
  return { pending: queue.length, sentToday, dailyLimit: env.MAIL_DAILY_LIMIT };
}

/** Solo para tests. */
export function __resetEmailQueue(): void {
  queue = [];
  processing = false;
  sentToday = 0;
  counterDate = '';
}
