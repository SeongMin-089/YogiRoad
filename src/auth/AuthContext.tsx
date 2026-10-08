import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { auth } from '../config/firebase';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function requireEnvironmentValue(name: string, value: string | undefined): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`${name} 환경변수가 설정되지 않았습니다.`);
  }
  return normalized;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => onAuthStateChanged(auth, currentUser => {
    setUser(currentUser);
    setLoading(false);
  }), []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    signInWithGoogle: async () => {
      const webClientId = requireEnvironmentValue(
        'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      );
      const iosClientId = Platform.OS === 'ios'
        ? requireEnvironmentValue(
          'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
          process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
        )
        : undefined;

      try {
        const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
        GoogleSignin.configure({ webClientId, iosClientId, offlineAccess: false });
        if (Platform.OS === 'android') {
          await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        }

        const response = await GoogleSignin.signIn();
        if (response.type === 'cancelled') return;

        const idToken = response.data.idToken;
        if (!idToken) {
          throw new Error('Google ID token을 받지 못했습니다. Web OAuth client ID를 확인해 주세요.');
        }

        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(auth, credential);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('native module') || message.includes('RNGoogleSignin')) {
          throw new Error('Google 로그인은 Expo Go가 아닌 개발 빌드에서 실행해야 합니다.');
        }
        throw error;
      }
    },
    signOut: async () => {
      await firebaseSignOut(auth);
      try {
        const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
        await GoogleSignin.signOut();
      } catch {
        // Firebase session is already cleared; Google SDK may be unavailable in Expo Go.
      }
    },
  }), [loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth는 AuthProvider 내부에서 사용해야 합니다.');
  }
  return context;
}
