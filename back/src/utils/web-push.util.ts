import webpush from 'web-push';
import { env } from '../config/env';

// Configurar claves VAPID para Web Push Notifications
webpush.setVapidDetails(
  env.VAPID_SUBJECT,
  env.VAPID_PUBLIC_KEY,
  env.VAPID_PRIVATE_KEY,
);

export interface PushNotificationPayload {
  title: string;
  message: string;
  type?: string;
  link?: string;
}

export interface PushSubscriptionKeys {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function sendWebPushNotification(
  subscription: PushSubscriptionKeys,
  payload: PushNotificationPayload,
): Promise<{ success: boolean; shouldRemove: boolean }> {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload),
    );
    return { success: true, shouldRemove: false };
  } catch (error: unknown) {
    const pushError = error as { statusCode?: number; message?: string };
    // Status 404 o 410 significa que la suscripción en el navegador/celular expiró o fue revocada
    if (pushError.statusCode === 404 || pushError.statusCode === 410) {
      return { success: false, shouldRemove: true };
    }
    console.error('Error enviando Web Push:', pushError.message || pushError);
    return { success: false, shouldRemove: false };
  }
}
