import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY = '@yogiroad/access-token';

let cachedToken: string | null | undefined;
let unauthorizedHandler: (() => void) | null = null;

export async function getAccessToken(): Promise<string | null> {
  if (cachedToken !== undefined) return cachedToken;
  cachedToken = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  return cachedToken;
}

export async function setAccessToken(token: string): Promise<void> {
  cachedToken = token;
  await AsyncStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export async function clearAccessToken(): Promise<void> {
  cachedToken = null;
  await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function setUnauthorizedHandler(handler: (() => void) | null): () => void {
  unauthorizedHandler = handler;
  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = null;
  };
}

export function notifyUnauthorized(): void {
  unauthorizedHandler?.();
}
