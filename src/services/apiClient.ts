export type ApiErrorKind = 'CONFIG' | 'NETWORK' | 'HTTP' | 'INVALID_RESPONSE';

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

const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const API_BASE_URL = configuredBaseUrl?.replace(/\/+$/, '');

function getApiUrl(path: string): string {
  if (!API_BASE_URL) {
    throw new ApiError(
      'CONFIG',
      'EXPO_PUBLIC_API_BASE_URL이 설정되지 않았습니다. 프로젝트 루트의 .env를 확인해 주세요.',
    );
  }
  return `${API_BASE_URL}${path}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

async function getServerErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (isRecord(body) && typeof body.message === 'string' && body.message.trim()) {
      return body.message.trim();
    }
  } catch {
    // Fall back to an HTTP status message when the server did not return JSON.
  }
  return `서버 요청에 실패했습니다. (HTTP ${response.status})`;
}

async function sendRequest(path: string, init?: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(getApiUrl(path), init);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      'NETWORK',
      '백엔드 서버에 연결할 수 없습니다. Spring Boot 실행 상태와 API 주소를 확인해 주세요.',
    );
  }

  if (!response.ok) {
    throw new ApiError('HTTP', await getServerErrorMessage(response), response.status);
  }

  return response;
}

export async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await sendRequest(path, init);
  try {
    return await response.json() as T;
  } catch {
    throw new ApiError('INVALID_RESPONSE', '서버 응답을 읽을 수 없습니다.');
  }
}

export async function requestNoContent(path: string, init?: RequestInit): Promise<void> {
  await sendRequest(path, init);
}
