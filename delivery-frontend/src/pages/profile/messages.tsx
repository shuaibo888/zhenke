import {
  CommentOutlined,
  CheckCircleOutlined,
  MessageOutlined,
  RightOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { Avatar, Button, message } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'umi';
import { useShop } from '@/app/ShopContext';
import { LoginRedirect } from '@/components/LoginRedirect';
import { ZkProfilePage, ZkProfilePanel, ZkState, ZkTaskHeader } from '@/components/ZkPage';
import { useUnreadNotificationCount } from '@/hooks/useUnreadNotificationCount';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationEventType,
  type ShopNotification,
} from '@/services/notifications';
import styles from './messages.module.less';

const PAGE_SIZE = 15;

function eventCopy(eventType: NotificationEventType, actorName: string) {
  switch (eventType) {
    case 'POST_USEFUL': return `${actorName} 觉得你的甄客帖很有用`;
    case 'POST_FEATURED': return '你的甄客帖已入选编辑推荐';
    case 'REPORT_USEFUL': return `${actorName} 觉得你的甄客验很有用`;
    case 'POST_REPLY':
    case 'REPORT_REPLY': return `${actorName} 回复了你的评论`;
    case 'POST_COMMENT': return `${actorName} 评论了你的甄客帖`;
    case 'REPORT_COMMENT': return `${actorName} 评论了你的甄客验`;
    default: return `${actorName} 与你的内容产生了新互动`;
  }
}

function eventLabel(eventType: NotificationEventType) {
  if (eventType === 'POST_FEATURED') return '编辑推荐';
  if (eventType.endsWith('USEFUL')) return '有用';
  if (eventType.endsWith('REPLY')) return '回复';
  return '评论';
}

function eventIcon(eventType: NotificationEventType) {
  if (eventType === 'POST_FEATURED') return <StarOutlined />;
  if (eventType.endsWith('USEFUL')) return <CheckCircleOutlined />;
  if (eventType.endsWith('REPLY')) return <CommentOutlined />;
  return <MessageOutlined />;
}

function formatTime(value: string) {
  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function safeTargetPath(item: ShopNotification) {
  const expected = item.targetType === 'POST'
    ? `/posts/${item.targetId}`
    : `/reports/${item.targetId}`;
  return item.targetPath === expected ? item.targetPath : expected;
}

export default function ProfileMessagesPage() {
  const navigate = useNavigate();
  const { user, authLoading } = useShop();
  const {
    unreadCount,
    loading: unreadLoading,
    error: unreadError,
    refresh: refreshUnread,
    setUnreadCount,
  } = useUnreadNotificationCount(user?.id);
  const [rows, setRows] = useState<ShopNotification[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [markingIds, setMarkingIds] = useState<Set<number>>(new Set());
  const [markingAll, setMarkingAll] = useState(false);
  const activeUserId = useRef(user?.id);
  const requestVersion = useRef(0);
  activeUserId.current = user?.id;

  const load = useCallback(async (pageNum = 1, append = false) => {
    if (!user) return;
    const userId = user.id;
    const version = ++requestVersion.current;
    if (append) setLoadingMore(true);
    else setLoading(true);
    if (!append) setError('');
    try {
      const result = await fetchNotifications(pageNum, PAGE_SIZE);
      if (version !== requestVersion.current || activeUserId.current !== userId) return;
      setRows((current) => {
        if (!append) return result.rows;
        const knownIds = new Set(current.map((item) => item.notificationId));
        return [...current, ...result.rows.filter((item) => !knownIds.has(item.notificationId))];
      });
      setPage(pageNum);
      setTotal(result.total);
    } catch (reason) {
      if (version !== requestVersion.current || activeUserId.current !== userId) return;
      const text = reason instanceof Error ? reason.message : '消息加载失败';
      if (append) message.error(text);
      else setError(text);
    } finally {
      if (version === requestVersion.current && activeUserId.current === userId) {
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    requestVersion.current += 1;
    setRows([]);
    setPage(1);
    setTotal(0);
    setError('');
    setMarkingIds(new Set());
    if (authLoading || !user) {
      setLoading(!authLoading);
      return;
    }
    void load(1);
  }, [authLoading, load, user?.id]);

  const unreadInLoadedRows = useMemo(() => rows.filter((item) => !item.read).length, [rows]);

  const markOne = useCallback(async (item: ShopNotification) => {
    if (item.read || markingIds.has(item.notificationId)) return true;
    const userId = user?.id;
    if (userId == null) return false;
    setMarkingIds((current) => new Set(current).add(item.notificationId));
    try {
      await markNotificationRead(item.notificationId);
      if (activeUserId.current !== userId) return false;
      requestVersion.current += 1;
      setLoading(false);
      setLoadingMore(false);
      setRows((current) => current.map((row) => row.notificationId === item.notificationId
        ? { ...row, read: true, readTime: new Date().toISOString() }
        : row));
      setUnreadCount((current) => current == null ? current : Math.max(0, current - 1));
      return true;
    } catch (reason) {
      if (activeUserId.current !== userId) return false;
      message.error(reason instanceof Error ? reason.message : '标记已读失败');
      return false;
    } finally {
      if (activeUserId.current === userId) {
        setMarkingIds((current) => {
          const next = new Set(current);
          next.delete(item.notificationId);
          return next;
        });
      }
    }
  }, [markingIds, setUnreadCount, user?.id]);

  const openMessage = useCallback(async (item: ShopNotification) => {
    if (!item.read) await markOne(item);
    navigate(safeTargetPath(item));
  }, [markOne, navigate]);

  const markAll = useCallback(async () => {
    const userId = user?.id;
    if (userId == null) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      if (activeUserId.current !== userId) return;
      requestVersion.current += 1;
      setLoading(false);
      setLoadingMore(false);
      const readTime = new Date().toISOString();
      setRows((current) => current.map((item) => ({ ...item, read: true, readTime })));
      setUnreadCount(0);
      message.success('全部消息已标为已读');
    } catch (reason) {
      if (activeUserId.current !== userId) return;
      message.error(reason instanceof Error ? reason.message : '全部标为已读失败');
      await refreshUnread();
    } finally {
      if (activeUserId.current === userId) setMarkingAll(false);
    }
  }, [refreshUnread, setUnreadCount, user?.id]);

  if (authLoading) {
    return <ZkProfilePage><ZkState kind="loading" title="正在确认登录状态" /></ZkProfilePage>;
  }
  if (!user) return <LoginRedirect />;

  return (
    <ZkProfilePage className={styles.page}>
      <ZkTaskHeader
        eyebrow="互动通知"
        title="消息中心"
        description="查看别人与你的甄客帖、甄客验和评论产生的互动。"
        backTo="/profile"
        aside={(
          <Button
            type="text"
            loading={markingAll}
            disabled={unreadLoading || (unreadCount === 0 && unreadInLoadedRows === 0)}
            onClick={() => void markAll()}
          >
            全部已读
          </Button>
        )}
      />

      <ZkProfilePanel
        className={styles.panel}
        title="全部消息"
        meta={unreadCount === null ? '未读数暂不可用' : `${unreadCount} 条未读`}
      >
        {unreadError && (
          <div className={styles.countError} role="alert">
            <span>未读数量暂时无法更新：{unreadError}</span>
            <Button type="link" size="small" onClick={() => void refreshUnread()}>重试</Button>
          </div>
        )}
        {loading ? (
          <ZkState kind="loading" title="正在加载消息" />
        ) : error ? (
          <ZkState kind="error" title="暂时无法加载消息" description={error} onAction={() => void load(1)} />
        ) : rows.length === 0 ? (
          <ZkState title="还没有消息" description="有人与你发布的甄客帖、甄客验或评论互动时，会在这里提醒你。" />
        ) : (
          <>
            <div className={styles.list}>
              {rows.map((item) => (
                <article
                  key={item.notificationId}
                  className={`${styles.item} ${item.read ? styles.read : styles.unread}`}
                >
                  <button
                    type="button"
                    className={styles.itemMain}
                    onClick={() => void openMessage(item)}
                    aria-label={`${item.read ? '已读' : '未读'}消息：${eventCopy(item.eventType, item.actorName)}，查看相关内容`}
                  >
                    <span className={styles.avatarWrap}>
                      <Avatar src={item.actorAvatar} size={46}>{item.actorName.slice(0, 1)}</Avatar>
                      <span className={styles.eventIcon} aria-hidden="true">{eventIcon(item.eventType)}</span>
                    </span>
                    <span className={styles.copy}>
                      <span className={styles.copyTop}>
                        <strong>{eventCopy(item.eventType, item.actorName)}</strong>
                        <time dateTime={item.createTime.replace(' ', 'T')}>{formatTime(item.createTime)}</time>
                      </span>
                      <span className={styles.target}>
                        <em>{eventLabel(item.eventType)}</em>
                        <span>{item.targetTitle || (item.targetType === 'POST' ? '甄客帖' : '甄客验')}</span>
                      </span>
                      {item.contentPreview && <span className={styles.preview}>“{item.contentPreview}”</span>}
                    </span>
                    <RightOutlined className={styles.arrow} aria-hidden="true" />
                  </button>
                  {!item.read && (
                    <Button
                      type="text"
                      size="small"
                      className={styles.readAction}
                      loading={markingIds.has(item.notificationId)}
                      onClick={() => void markOne(item)}
                    >
                      标为已读
                    </Button>
                  )}
                </article>
              ))}
            </div>
            <footer className={styles.footer}>
              <span>已显示 {rows.length} / {total} 条{unreadInLoadedRows > 0 ? `，当前页还有 ${unreadInLoadedRows} 条未读` : ''}</span>
              {rows.length < total && (
                <Button loading={loadingMore} onClick={() => void load(page + 1, true)}>加载更多</Button>
              )}
            </footer>
          </>
        )}
      </ZkProfilePanel>
    </ZkProfilePage>
  );
}
