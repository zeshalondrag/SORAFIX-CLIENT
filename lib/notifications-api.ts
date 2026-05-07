import { api } from './api';

export type Notification = {
  id: number;
  userId: number;
  user_id?: number;
  requestId: number | null;
  request_id?: number;
  title?: string;
  message: string;
  isRead: boolean;
  is_read?: boolean;
  createdAt: string;
  created_at?: string;
};

export type CreateNotificationPayload = {
  userId: number;
  requestId?: number | null;
  title: string;
  message: string;
};

export const notificationsApi = {
  // Получить уведомления текущего пользователя
  async getNotifications(): Promise<Notification[]> {
    return api.get<Notification[]>('/Notifications/my');
  },

  // Получить уведомление по ID
  async getNotification(id: number): Promise<Notification> {
    return api.get<Notification>(`/Notifications/${id}`);
  },

  // Пометить уведомление как прочитанное
  async markAsRead(id: number): Promise<void> {
    return api.patch(`/Notifications/${id}/read`);
  },

  // Пометить все как прочитанные
  async markAllAsRead(): Promise<void> {
    return api.patch('/Notifications/read-all');
  },

  // Создать уведомление
  async create(data: CreateNotificationPayload): Promise<Notification> {
    return api.post<Notification>('/Notifications', data);
  },
};

// Хелперы
export function isRead(notification: Notification): boolean {
  return notification.isRead ?? notification.is_read ?? false;
}

export function getCreatedAt(notification: Notification): string {
  return notification.createdAt ?? notification.created_at ?? '';
}

export function getRequestId(notification: Notification): number {
  return notification.requestId ?? notification.request_id ?? 0;
}

export type NotifType =
  | 'request_created'
  | 'price_assigned'
  | 'status_changed'
  | 'request_cancelled'
  | 'request_closed'
  | 'client_request_created'
  | 'client_request_cancelled'
  | 'specialist_assigned'
  | 'specialist_accepted'
  | 'specialist_completed';

export function getNotificationType(message: string): NotifType {
  // Специалистские уведомления
  if (message.includes('Вам назначена новая заявка')) return 'specialist_assigned';
  if (message.includes('Специалист принял')) return 'specialist_accepted';
  if (message.includes('выполнена специалистом')) return 'specialist_completed';

  // Менеджерские уведомления
  if (message.includes('Клиент отменил')) return 'client_request_cancelled';
  if (message.includes('Новая заявка') && message.includes('от клиента')) return 'client_request_created';

  // Клиентские уведомления
  if (message.includes('успешно создана')) return 'request_created';
  if (message.includes('выставлена цена')) {
    return 'price_assigned';
  }
  if (message.includes('закрыта') || (message.includes('изменён на') && message.includes('Закрыта')))
    return 'request_closed';
  if (message.includes('отменена') || (message.includes('изменён на') && message.includes('Отменена')))
    return 'request_cancelled';
  if (message.includes('изменён на')) return 'status_changed';

  return 'status_changed';
}

export function formatNotificationDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Только что';
    if (diffMins < 60) return `${diffMins} мин. назад`;
    if (diffHours < 24) return `${diffHours} ч. назад`;
    if (diffDays < 7) return `${diffDays} дн. назад`;

    return d.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}
