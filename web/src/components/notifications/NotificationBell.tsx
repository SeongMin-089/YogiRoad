import { NavLink } from 'react-router-dom';
import { useNotifications } from '../../notifications/NotificationContext';
import { Icon } from '../Icon';
import styles from './NotificationBell.module.scss';

export function NotificationBell() {
  const { unreadCount, loading } = useNotifications();
  return (
    <NavLink className={({ isActive }) => `${styles.button} ${isActive ? styles.active : ''}`}
      to="/notifications" aria-label={unreadCount ? `알림 ${unreadCount}개 읽지 않음` : '알림'}>
      <Icon name="bell" />
      {!loading && unreadCount > 0 && <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
    </NavLink>
  );
}
