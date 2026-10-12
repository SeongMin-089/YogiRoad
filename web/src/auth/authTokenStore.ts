const ACCESS_TOKEN_KEY = 'yogiroad.access-token';

let cachedToken: string | null | undefined;
let unauthorizedHandler: (() => void) | null = null;

export function getAccessToken(): string | null {
  if (cachedToken !== undefined) return cachedToken;
  cachedToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);
  return cachedToken;
}

export function setAccessToken(token: string): void {
  cachedToken = token;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  cachedToken = null;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
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
