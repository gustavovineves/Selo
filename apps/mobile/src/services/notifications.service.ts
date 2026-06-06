import { api } from './api';
import type {
  AppNotification,
  NotificationListResponse,
  UnreadCountResponse,
} from '../types/api';

// Listener module-level para atualizar o badge de não lidas sem Context
type UnreadListener = (count: number) => void;
let _unreadListener: UnreadListener | null = null;

export function setUnreadCountListener(fn: UnreadListener): void {
  _unreadListener = fn;
}

export function notifyUnreadCountChanged(count: number): void {
  _unreadListener?.(count);
}

export interface ListNotificationsParams {
  read?: boolean;
  type?: string;
  page?: number;
  limit?: number;
}

export const notificationsService = {
  list(params: ListNotificationsParams = {}): Promise<NotificationListResponse> {
    const qs = new URLSearchParams();
    if (params.read === false) qs.set('read', 'false');
    if (params.read === true) qs.set('read', 'true');
    if (params.type) qs.set('type', params.type);
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    const query = qs.toString();
    return api.get<NotificationListResponse>(`/notifications${query ? `?${query}` : ''}`);
  },

  getUnreadCount(): Promise<UnreadCountResponse> {
    return api.get<UnreadCountResponse>('/notifications/unread-count');
  },

  markAsRead(id: string): Promise<AppNotification> {
    return api.post<AppNotification>(`/notifications/${id}/read`, {});
  },

  async markAllAsRead(): Promise<{ count: number }> {
    const result = await api.post<{ count: number }>('/notifications/read-all', {});
    notifyUnreadCountChanged(0);
    return result;
  },
};
