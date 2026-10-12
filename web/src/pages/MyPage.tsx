import { useAuth } from '../auth/AuthContext';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import styles from './Pages.module.scss';

export function MyPage() {
  const { user, signOut } = useAuth();

  return (
    <div>
      <PageHeader eyebrow="Account" title="마이" description="현재 로그인한 계정과 웹 세션을 관리합니다." />
      <section className={styles.profileCard}>
        {user?.profileImageUrl
          ? <img src={user.profileImageUrl} alt="" referrerPolicy="no-referrer" />
          : <span className={styles.profileFallback}><Icon name="user" /></span>}
        <div className={styles.profileCopy}>
          <span>카카오 로그인</span>
          <h2>{user?.nickname?.trim() || 'YogiRoad 사용자'}</h2>
          <p>사용자 ID · {user?.userId}</p>
        </div>
        <button className={styles.logoutButton} type="button" onClick={signOut}><Icon name="logout" />로그아웃</button>
      </section>
    </div>
  );
}
