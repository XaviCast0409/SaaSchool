export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  const userAgent = navigator.userAgent || navigator.vendor || (window as unknown as { opera?: string }).opera || '';
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isSmallScreen = window.innerWidth <= 768;
  return isMobileUA || isSmallScreen;
};

export const isPushSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
};

export const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!isPushSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    await navigator.serviceWorker.ready;
    return registration;
  } catch (error) {
    console.error('Error registrando Service Worker:', error);
    return null;
  }
};

export const subscribeUserToPush = async (
  vapidPublicKey: string,
): Promise<{ endpoint: string; keys: { p256dh: string; auth: string }; userAgent?: string } | null> => {
  if (!isPushSupported()) {
    throw new Error('Las notificaciones Push no están soportadas en este navegador');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Permiso de notificaciones denegado');
  }

  const registration = await registerServiceWorker();
  if (!registration) {
    throw new Error('No se pudo inicializar el Service Worker');
  }

  // Comprobar suscripción existente o crear una nueva
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey as unknown as BufferSource,
    });
  }

  const jsonSub = subscription.toJSON();
  if (!jsonSub.endpoint || !jsonSub.keys?.p256dh || !jsonSub.keys?.auth) {
    throw new Error('Datos de suscripción incompletos');
  }

  return {
    endpoint: jsonSub.endpoint,
    keys: {
      p256dh: jsonSub.keys.p256dh,
      auth: jsonSub.keys.auth,
    },
    userAgent: navigator.userAgent,
  };
};
