import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { useNotifications } from '../notifications/NotificationContext';
import { ApiError } from '../services/apiClient';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../services/notificationApi';
import type { RestaurantNotification } from '../types/notifications';
import styles from './NotificationsPage.module.scss';

const PAGE_SIZE = 20;

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium', timeStyle: 'short',
  }).format(date);
}

function mapUrl(notification: RestaurantNotification): string {
  const query = new URLSearchParams({
    region: notification.regionKey.split('|').join(' '),
    managementNumber: notification.managementNumber,
    storeName: notification.storeName,
    businessType: notification.businessType ?? '',
    address: notification.address ?? '',
    roadAddress: notification.roadAddress ?? '',
    lotNumberAddress: notification.lotNumberAddress ?? '',
    licenseDate: notification.licenseDate,
  });
  if (notification.latitude !== null) query.set('latitude', String(notification.latitude));
  if (notification.longitude !== null) query.set('longitude', String(notification.longitude));
  return `/map?${query.toString()}`;
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const { refreshUnreadCount, unreadCount } = useNotifications();
  const [items, setItems] = useState<RestaurantNotification[]>([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadControllerRef = useRef<AbortController | null>(null);
  const loadSequenceRef = useRef(0);
  const pendingReadsRef = useRef(new Set<string>());

  const load = useCallback(async (nextPage: number, append: boolean) => {
    const sequence = ++loadSequenceRef.current;
    loadControllerRef.current?.abort();
    const controller = new AbortController();
    loadControllerRef.current = controller;
    append ? setLoadingMore(true) : setLoading(true);
    setError(null);
    try {
      const result = await getNotifications(nextPage, PAGE_SIZE, controller.signal);
      if (sequence !== loadSequenceRef.current) return;
      setItems(current => append ? [...current, ...result.items] : result.items);
      setPage(result.page);
      setHasNext(result.hasNext);
    } catch (requestError) {
      if (controller.signal.aborted || sequence !== loadSequenceRef.current) return;
      setError(requestError instanceof ApiError ? requestError.message : '알림을 불러오지 못했습니다.');
    } finally {
      if (sequence === loadSequenceRef.current) {
        append ? setLoadingMore(false) : setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void load(0, false);
    return () => {
      loadSequenceRef.current += 1;
      loadControllerRef.current?.abort();
    };
  }, [load]);

  async function open(notification: RestaurantNotification): Promise<void> {
    if (!notification.isRead) {
      if (pendingReadsRef.current.has(notification.id)) return;
      pendingReadsRef.current.add(notification.id);
      try {
        await markNotificationRead(notification.id);
        setItems(current => current.map(item => item.id === notification.id ? { ...item, isRead: true } : item));
        await refreshUnreadCount();
      } catch (requestError) {
        setError(requestError instanceof ApiError ? requestError.message : '알림을 읽음 처리하지 못했습니다.');
        return;
      } finally {
        pendingReadsRef.current.delete(notification.id);
      }
    }
    navigate(mapUrl(notification));
  }

  async function markAll(): Promise<void> {
    if (!unreadCount || markingAll) return;
    setMarkingAll(true);
    setError(null);
    try {
      await markAllNotificationsRead();
      setItems(current => current.map(item => ({ ...item, isRead: true })));
      await refreshUnreadCount();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : '알림을 모두 읽음 처리하지 못했습니다.');
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader eyebrow="Notifications" title="알림" description="담당 지역에서 새롭게 확인된 음식점 인허가 정보입니다." />
      <div className={styles.toolbar}>
        <span>읽지 않은 알림 <strong>{unreadCount}</strong>개</span>
        <button type="button" disabled={!unreadCount || markingAll} onClick={() => { void markAll(); }}>
          <Icon name="check" />{markingAll ? '처리 중...' : '모두 읽음'}
        </button>
      </div>

      {error && <div className={styles.error} role="alert">
        <span>{error}</span>
        {!items.length && <button type="button" onClick={() => { void load(0, false); }}>다시 시도</button>}
      </div>}

      {loading ? <div className={styles.state}><span className="spinner" /><strong>알림을 불러오는 중...</strong></div>
        : items.length === 0 ? <div className={styles.empty}>
          <span className={styles.emptyIcon}><Icon name="bell" /></span>
          <strong>새로운 알림이 없습니다</strong>
          <p>담당 지역에서 새 인허가 음식점이 발견되면 이곳에 표시됩니다.</p>
        </div>
          : <div className={styles.list}>
            {items.map(notification => <button
              type="button"
              key={notification.id}
              className={`${styles.item} ${notification.isRead ? '' : styles.unread}`}
              onClick={() => { void open(notification); }}
            >
              <span className={styles.itemIcon}><Icon name="pin" /></span>
              <span className={styles.copy}>
                <span className={styles.topline}>
                  <strong>{notification.storeName || '상호명 미제공'}</strong>
                  {!notification.isRead && <i>NEW</i>}
                </span>
                <span className={styles.address}>{notification.address || '주소 정보 없음'}</span>
                <span className={styles.meta}>
                  {notification.businessType || '업종 미제공'} · 인허가 {notification.licenseDate} · {formatDateTime(notification.createdAt)}
                </span>
              </span>
              <Icon name="chevron" />
            </button>)}
          </div>}

      {hasNext && <button className={styles.more} type="button" disabled={loadingMore}
        onClick={() => { void load(page + 1, true); }}>
        {loadingMore ? '불러오는 중...' : '알림 더 보기'}
      </button>}
    </div>
  );
}
