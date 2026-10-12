import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { clearAccessToken, getAccessToken, setAccessToken, setUnauthorizedHandler } from './authTokenStore';
import {
  createKakaoLoginSession,
  getKakaoLoginSession,
  getMe,
  type AuthUser,
} from '../services/authApi';
import { getUserProfile } from '../services/userProfileApi';
import type { UserProfile } from '../types/userProfile';

const POLL_INTERVAL_MS = 1_500;
const LOGIN_TIMEOUT_MS = 5 * 60 * 1_000;

type AuthContextValue = {
  user: AuthUser | null;
  profile: UserProfile | null;
  initializing: boolean;
  signInWithKakao: () => Promise<void>;
  signOut: () => void;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function delay(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [initializing, setInitializing] = useState(true);
  const loginInProgress = useRef(false);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        if (getAccessToken()) {
          const currentUser = await getMe();
          const currentProfile = await getUserProfile().catch(() => null);
          if (active) {
            setUser(currentUser);
            setProfile(currentProfile);
          }
        }
      } catch {
        clearAccessToken();
      } finally {
        if (active) setInitializing(false);
      }
    }

    void restoreSession();
    const unsubscribe = setUnauthorizedHandler(() => {
      setUser(null);
      setProfile(null);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const signInWithKakao = useCallback(async () => {
    if (loginInProgress.current) return;
    loginInProgress.current = true;
    const popup = window.open('about:blank', 'yogiroad-kakao-login', 'popup,width=480,height=720');

    if (!popup) {
      loginInProgress.current = false;
      throw new Error('로그인 팝업을 열 수 없습니다. 브라우저의 팝업 차단 설정을 확인해 주세요.');
    }

    try {
      popup.document.title = '카카오 로그인 연결 중';
      const session = await createKakaoLoginSession();
      popup.location.replace(session.loginUrl);

      const deadline = Date.now() + LOGIN_TIMEOUT_MS;
      while (Date.now() < deadline) {
        const status = await getKakaoLoginSession(session.loginId);
        if (status.status === 'SUCCESS' && status.accessToken) {
          setAccessToken(status.accessToken);
          setUser(await getMe());
          setProfile(await getUserProfile().catch(() => null));
          popup.close();
          return;
        }
        if (status.status === 'FAILED' || status.status === 'EXPIRED') {
          throw new Error(status.message || '카카오 로그인 세션을 완료하지 못했습니다.');
        }
        if (popup.closed) throw new Error('로그인 창이 닫혔습니다. 다시 시도해 주세요.');
        await delay(POLL_INTERVAL_MS);
      }
      throw new Error('로그인 시간이 만료되었습니다. 다시 시도해 주세요.');
    } finally {
      if (!popup.closed) popup.close();
      loginInProgress.current = false;
    }
  }, []);

  const signOut = useCallback(() => {
    clearAccessToken();
    setUser(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!getAccessToken()) return;
    setProfile(await getUserProfile());
  }, []);

  const value = useMemo(
    () => ({ user, profile, initializing, signInWithKakao, signOut, refreshProfile }),
    [initializing, profile, refreshProfile, signInWithKakao, signOut, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth는 AuthProvider 내부에서 사용해야 합니다.');
  return context;
}
