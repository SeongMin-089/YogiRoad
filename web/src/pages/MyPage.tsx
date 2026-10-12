import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { ApiError } from '../services/apiClient';
import { getUserProfile, updateUserProfile } from '../services/userProfileApi';
import type { UserProfile } from '../types/userProfile';
import styles from './MyPage.module.scss';

const PROVINCES = [
  '서울특별시', '부산광역시', '대구광역시', '인천광역시', '광주광역시', '대전광역시', '울산광역시',
  '세종특별자치시', '경기도', '강원특별자치도', '충청북도', '충청남도', '전북특별자치도', '전라남도',
  '경상북도', '경상남도', '제주특별자치도',
];

export function MyPage() {
  const { user, signOut, refreshProfile } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [town, setTown] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyProfile = useCallback((result: UserProfile) => {
    setProfile(result);
    setDisplayName(result.displayName ?? '');
    setProvince(result.managedRegion?.region1DepthName ?? '');
    setCity(result.managedRegion?.region2DepthName ?? '');
    setTown(result.managedRegion?.region3DepthName ?? '');
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void getUserProfile().then(result => { if (active) applyProfile(result); })
      .catch(requestError => { if (active) setError(requestError instanceof ApiError ? requestError.message : '사용자 정보를 불러오지 못했습니다.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [applyProfile]);

  async function save(event: FormEvent): Promise<void> {
    event.preventDefault();
    const hasAnyRegion = Boolean(province.trim() || city.trim() || town.trim());
    if (hasAnyRegion && (!province.trim() || !city.trim())) {
      setError('담당 지역의 시·도와 시·군·구를 모두 입력해 주세요.');
      return;
    }
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      applyProfile(await updateUserProfile({
        displayName: displayName.trim() || null,
        managedRegion: hasAnyRegion ? {
          region1DepthName: province.trim(), region2DepthName: city.trim(), region3DepthName: town.trim() || null,
        } : null,
      }));
      await refreshProfile();
      setMessage('내 정보와 담당 지역이 저장되었습니다.');
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : '사용자 정보를 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  }

  const effectiveName = profile?.effectiveName?.trim() || user?.nickname?.trim() || '이름을 설정해 주세요';
  const profileImageUrl = profile?.effectiveProfileImageUrl || user?.profileImageUrl;
  const regionQuery = profile?.managedRegion?.displayName;

  return (
    <div>
      <PageHeader eyebrow="Account" title="마이" description="내 정보와 담당 지역을 관리합니다." />
      {loading ? <div className={styles.state}><span className="spinner" /><strong>사용자 정보를 불러오는 중...</strong></div> : <>
        <section className={styles.profileCard}>
        {profileImageUrl
          ? <img className={styles.avatar} src={profileImageUrl} alt="" referrerPolicy="no-referrer" />
          : <span className={styles.profileFallback}><Icon name="user" /></span>}
        <div className={styles.profileCopy}>
          <span>카카오 로그인</span>
          <h2>{effectiveName}</h2>
          <p>사용자 ID · {user?.userId}</p>
        </div>
      </section>

      <form onSubmit={event => { void save(event); }}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}><div><h2>내 정보 수정</h2><p>직접 설정한 이름이 카카오 닉네임보다 우선 표시됩니다.</p></div></div>
          <label className={styles.label}>표시 이름
            <input value={displayName} maxLength={40} onChange={event => setDisplayName(event.target.value)}
              placeholder={profile?.kakaoNickname || '이름을 입력해 주세요'} />
          </label>
          <p className={styles.note}>프로필 사진은 현재 카카오 제공 이미지 또는 기본 이미지를 사용합니다. 직접 업로드에는 Firebase Storage 버킷과 업로드 보안 규칙 설정이 추가로 필요합니다.</p>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}><div><h2>담당 지역 설정</h2><p>신규 음식점 발굴과 향후 알림의 기준으로 사용됩니다.</p></div></div>
          {profile?.managedRegion && <div className={styles.regionSummary}><Icon name="location" /><span>현재 담당 지역 · <strong>{profile.managedRegion.displayName}</strong></span></div>}
          <div className={styles.fieldGrid}>
            <label className={styles.label}>시·도
              <select value={province} onChange={event => setProvince(event.target.value)}>
                <option value="">선택해 주세요</option>
                {PROVINCES.map(option => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label className={styles.label}>시·군·구
              <input value={city} maxLength={40} onChange={event => setCity(event.target.value)} placeholder="예: 남양주시" />
            </label>
            <label className={styles.label}>읍·면·동 (선택)
              <input value={town} maxLength={40} onChange={event => setTown(event.target.value)} placeholder="예: 진접읍" />
            </label>
          </div>
          <div className={styles.actions}>
            <button className={styles.primary} type="submit" disabled={saving}>{saving ? '저장 중...' : '내 정보 저장'}</button>
            {regionQuery && <Link className={styles.secondary} to={`/map?region=${encodeURIComponent(regionQuery)}`}><Icon name="map" />담당 지역 지도 보기</Link>}
            {(province || city || town) && <button className={styles.secondary} type="button" disabled={saving}
              onClick={() => { setProvince(''); setCity(''); setTown(''); }}>담당 지역 지우기</button>}
          </div>
        </section>
      </form>

      {message && <p className={styles.message} role="status">{message}</p>}
      {error && <p className={`${styles.message} ${styles.error}`} role="alert">{error}</p>}

      <section className={styles.section}>
        <div className={styles.sectionHeader}><div><h2>계정</h2><p>로그아웃하면 이 브라우저에 저장된 JWT 세션이 삭제됩니다.</p></div></div>
        <button className={styles.danger} type="button" onClick={signOut}><Icon name="logout" />로그아웃</button>
      </section>
      </>}
    </div>
  );
}
