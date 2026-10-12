import { clearAccessToken, getAccessToken, notifyUnauthorized } from '../auth/authTokenStore';

export type ApiErrorKind = 'AUTH' | 'NETWORK' | 'HTTP' | 'INVALID_RESPONSE';

export class ApiError extends Error {
  constructor(
    public readonly kind: ApiErrorKind,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '');

function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

async function serverErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (isRecord(body) && typeof body.message === 'string' && body.message.trim()) {
      return body.message.trim();
    }
  } catch {
    // JSON 오류 본문이 아니면 HTTP 상태 메시지를 사용합니다.
  }
  return `서버 요청에 실패했습니다. (HTTP ${response.status})`;
}

async function send(path: string, init: RequestInit = {}, authenticated = true): Promise<Response> {
  const headers = new Headers(init.headers);
  if (authenticated) {
    const token = getAccessToken();
    if (!token) throw new ApiError('AUTH', '로그인이 필요합니다.', 401);
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(apiUrl(path), { ...init, headers });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('NETWORK', '백엔드 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.');
  }

  if (!response.ok) {
    if (response.status === 401 && authenticated) {
      clearAccessToken();
      notifyUnauthorized();
      throw new ApiError('AUTH', '로그인이 만료되었습니다. 다시 로그인해 주세요.', 401);
    }
    throw new ApiError('HTTP', await serverErrorMessage(response), response.status);
  }
  return response;
}

async function parseJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError('INVALID_RESPONSE', '서버 응답을 읽을 수 없습니다.');
  }
}

export async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  return parseJson<T>(await send(path, init));
}

export async function requestPublicJson<T>(path: string, init?: RequestInit): Promise<T> {
  return parseJson<T>(await send(path, init, false));
}

export async function requestNoContent(path: string, init?: RequestInit): Promise<void> {
  await send(path, init);
}
