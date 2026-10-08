import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  type Auth,
  type Persistence,
} from 'firebase/auth';
import * as FirebaseAuth from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const missingKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value?.trim())
  .map(([key]) => key);

if (missingKeys.length > 0) {
  throw new Error(`Firebase 환경변수가 설정되지 않았습니다: ${missingKeys.join(', ')}`);
}

export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Firebase 13 exposes this at runtime through its React Native entrypoint, but its
// top-level TypeScript declaration currently omits the conditional export.
const getReactNativePersistence = (FirebaseAuth as typeof FirebaseAuth & {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
}).getReactNativePersistence;

function createAuth(): Auth {
  try {
    return initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('already-initialized')) {
      return getAuth(firebaseApp);
    }
    throw error;
  }
}

export const auth = createAuth();
