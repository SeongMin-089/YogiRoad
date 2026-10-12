import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { BrandMark } from '../BrandMark';
import { Icon } from '../Icon';
import { navigationItems } from '../../config/navigation';
import styles from './AppShell.module.scss';

function UserAvatar() {
  const { user } = useAuth();
  if (user?.profileImageUrl) {
    return <img className={styles.avatar} src={user.profileImageUrl} alt="" referrerPolicy="no-referrer" />;
  }
  return <span className={styles.avatarFallback}><Icon name="user" /></span>;
}

export function AppShell() {
  const { user } = useAuth();

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <BrandMark />
        <nav className={styles.desktopNav} aria-label="주요 메뉴">
          {navigationItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className={styles.sidebarProfile}>
          <UserAvatar />
          <div>
            <strong>{user?.nickname?.trim() || 'YogiRoad 사용자'}</strong>
            <span>카카오 계정</span>
          </div>
        </div>
      </aside>

      <div className={styles.workspace}>
        <header className={styles.mobileHeader}>
          <BrandMark />
          <NavLink to="/my" aria-label="마이 페이지"><UserAvatar /></NavLink>
        </header>
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>

      <nav className={styles.bottomNav} aria-label="주요 메뉴">
        {navigationItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) => `${styles.bottomItem} ${isActive ? styles.active : ''}`}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
