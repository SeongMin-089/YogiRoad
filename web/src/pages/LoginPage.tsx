import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { BrandMark } from '../components/BrandMark';
import styles from './LoginPage.module.scss';

export function LoginPage() {
  const { signInWithKakao } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setSubmitting(true);
    setError(null);
    try {
      await signInWithKakao();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '로그인 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.intro}>
        <BrandMark />
        <div>
          <span className={styles.eyebrow}>Sales discovery, thoughtfully connected</span>
          <h1>좋은 영업은<br />좋은 발견에서 시작됩니다.</h1>
          <p>음식점 발굴부터 상담 기록, 계약 현황까지 한 흐름으로 관리하세요.</p>
        </div>
        <div className={styles.signal} aria-hidden="true">
          <span>발굴</span><i /><span>관리</span><i /><span>성과</span>
        </div>
      </section>

      <section className={styles.loginPanel} aria-labelledby="login-title">
        <div className={styles.mobileBrand}><BrandMark /></div>
        <div className={styles.form}>
          <span className={styles.step}>YOGIROAD WEB</span>
          <h2 id="login-title">다시 만나 반가워요.</h2>
          <p>카카오 계정으로 로그인하면 기존 앱의 영업 데이터를 그대로 이용할 수 있습니다.</p>
          <button className={styles.kakaoButton} type="button" disabled={submitting} onClick={() => void handleLogin()}>
            <strong>K</strong>
            <span>{submitting ? '로그인 확인 중...' : '카카오로 시작하기'}</span>
          </button>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <small>로그인 시 사용자별 Firebase 데이터 분리와 기존 JWT 인증 정책이 유지됩니다.</small>
        </div>
      </section>
    </main>
  );
}
