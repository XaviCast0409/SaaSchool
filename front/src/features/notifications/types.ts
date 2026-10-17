export type NotificationType =
  | 'PAYMENT'
  | 'ATTENDANCE'
  | 'ANNOUNCEMENT'
  | 'ACADEMIC'
  | 'GENERAL';

export interface AppNotification {
  id: string;
  schoolId: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationFilters {
  isRead?: boolean;
  page?: number;
  limit?: number;
}

export interface NotificationsMeta {
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
}

export interface NotificationsResponse {
  status: string;
  data: AppNotification[];
  meta: NotificationsMeta;
}

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
}

export interface VapidKeyResponse {
  status: string;
  data: {
    publicKey: string;
  };
}
