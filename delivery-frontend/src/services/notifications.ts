import { requestApi, type ApiResponse, type TableResponse } from '@/services/apiClient';

export type NotificationEventType =
  | 'POST_USEFUL'
  | 'POST_COMMENT'
  | 'POST_REPLY'
  | 'REPORT_USEFUL'
  | 'REPORT_COMMENT'
  | 'REPORT_REPLY';

export interface ShopNotification {
  notificationId: number;
  actorShopUserId: number;
  actorName: string;
  actorAvatar?: string | null;
  eventType: NotificationEventType;
  targetType: 'POST' | 'REPORT';
  targetId: number;
  targetTitle?: string | null;
  contentPreview?: string | null;
  targetPath: string;
  read: boolean;
  readTime?: string | null;
  createTime: string;
}

const eventTypes = new Set<NotificationEventType>([
  'POST_USEFUL',
  'POST_COMMENT',
  'POST_REPLY',
  'REPORT_USEFUL',
  'REPORT_COMMENT',
  'REPORT_REPLY',
]);

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isOptionalString(value: unknown): value is string | null | undefined {
  return value == null || typeof value === 'string';
}

function isNotification(value: unknown): value is ShopNotification {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<ShopNotification>;
  return isPositiveInteger(item.notificationId)
    && isPositiveInteger(item.actorShopUserId)
    && typeof item.actorName === 'string'
    && item.actorName.trim().length > 0
    && isOptionalString(item.actorAvatar)
    && typeof item.eventType === 'string'
    && eventTypes.has(item.eventType as NotificationEventType)
    && (item.targetType === 'POST' || item.targetType === 'REPORT')
    && isPositiveInteger(item.targetId)
    && isOptionalString(item.targetTitle)
    && isOptionalString(item.contentPreview)
    && typeof item.targetPath === 'string'
    && typeof item.read === 'boolean'
    && isOptionalString(item.readTime)
    && typeof item.createTime === 'string'
    && item.createTime.trim().length > 0;
}

export async function fetchNotifications(pageNum = 1, pageSize = 15) {
  const query = new URLSearchParams({ pageNum: String(pageNum), pageSize: String(pageSize) });
  const result = await requestApi<TableResponse<ShopNotification>>(
    `/shop/notifications?${query.toString()}`,
    {},
    true,
  );
  if (!Array.isArray(result.rows) || !result.rows.every(isNotification)
    || !Number.isSafeInteger(result.total) || result.total < 0) {
    throw new Error('消息数据格式异常，请稍后重试');
  }
  return { rows: result.rows, total: result.total };
}

export async function fetchUnreadNotificationCount() {
  const result = await requestApi<ApiResponse<{ unreadCount: number }>>(
    '/shop/notifications/unread-count',
    {},
    true,
  );
  const count = result.data?.unreadCount;
  if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) {
    throw new Error('未读消息数量格式异常，请稍后重试');
  }
  return count;
}

export async function markNotificationRead(notificationId: number) {
  await requestApi<ApiResponse>(
    `/shop/notifications/${notificationId}/read`,
    { method: 'PUT' },
    true,
  );
}

export async function markAllNotificationsRead() {
  await requestApi<ApiResponse>('/shop/notifications/read-all', { method: 'PUT' }, true);
}
