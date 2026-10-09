import * as WebBrowser from 'expo-web-browser';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
  setUnauthorizedHandler,
} from './authTokenStore';
import {
  createKakaoLoginSession,
  getKakaoLoginSession,
  getMe,
  type AuthUser,
} from '../services/authApi';

const POLL_INTERVAL_MS = 1_500;
const LOGIN_TIMEOUT_MS = 5 * 60 * 1_000;

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  signInWithKakao: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const loginInProgress = useRef(false);

  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      try {
        if (await getAccessToken()) {
          const currentUser = await getMe();
          if (active) setUser(currentUser);
        }
      } catch {
        await clearAccessToken();
      } finally {
        if (active) setLoading(false);
      }
    };
    void restoreSession();
    const unsubscribe = setUnauthorizedHandler(() => setUser(null));
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    signInWithKakao: async () => {
      if (loginInProgress.current) return;
      loginInProgress.current = true;
      try {
        const session = await createKakaoLoginSession();
        let browserClosed = false;
        let browserError: unknown;
        void WebBrowser.openBrowserAsync(session.loginUrl, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        }).then(() => {
          browserClosed = true;
        }).catch(error => {
          browserError = error;
          browserClosed = true;
        });

        const deadline = Date.now() + LOGIN_TIMEOUT_MS;
        while (Date.now() < deadline) {
          if (browserError) throw browserError;
          const status = await getKakaoLoginSession(session.loginId);
          if (status.status === 'SUCCESS' && status.accessToken) {
            await setAccessToken(status.accessToken);
            setUser(await getMe());
            try {
              await WebBrowser.dismissBrowser();
            } catch {
              // The user may already have closed the browser.
            }
            return;
          }
          if (status.status === 'FAILED' || status.status === 'EXPIRED') {
            throw new Error(status.message || '카카오 로그인 세션을 완료하지 못했습니다.');
          }
          if (browserClosed && AppState.currentState === 'active') return;
          await delay(POLL_INTERVAL_MS);
        }
        throw new Error('로그인 시간이 만료되었습니다. 다시 시도해 주세요.');
      } finally {
        loginInProgress.current = false;
      }
    },
    signOut: async () => {
      await clearAccessToken();
      setUser(null);
    },
  }), [loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth는 AuthProvider 내부에서 사용해야 합니다.');
  return context;
}
