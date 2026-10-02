import type { SalesStatus } from '../types/sales';

export type SalesTarget = {
  storeId: string;
  storeName: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  status: SalesStatus;
  memo: string;
  registeredAt: string;
};

export type CreateSalesTargetRequest = {
  storeId: string;
  storeName: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
};

type ErrorKind = 'CONFIG' | 'NETWORK' | 'HTTP' | 'INVALID_RESPONSE';

export class SalesTargetApiError extends Error {
  constructor(
    public readonly kind: ErrorKind,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'SalesTargetApiError';
  }
}

const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const API_BASE_URL = configuredBaseUrl?.replace(/\/+$/, '');

function getApiUrl(path: string): string {
  if (!API_BASE_URL) {
    throw new SalesTargetApiError(
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(getApiUrl(path), init);
  } catch (error) {
    if (error instanceof SalesTargetApiError) throw error;
    throw new SalesTargetApiError(
      'NETWORK',
      '백엔드 서버에 연결할 수 없습니다. Spring Boot 실행 상태와 API 주소를 확인해 주세요.',
    );
  }

  if (!response.ok) {
    throw new SalesTargetApiError(
      'HTTP',
      await getServerErrorMessage(response),
      response.status,
    );
  }

  try {
    return await response.json() as T;
  } catch {
    throw new SalesTargetApiError('INVALID_RESPONSE', '서버 응답을 읽을 수 없습니다.');
  }
}

export function createSalesTarget(requestBody: CreateSalesTargetRequest): Promise<SalesTarget> {
  return request('/api/sales-targets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });
}

export function getSalesTargets(): Promise<SalesTarget[]> {
  return request('/api/sales-targets');
}

export function getSalesTarget(storeId: string): Promise<SalesTarget> {
  return request(`/api/sales-targets/${encodeURIComponent(storeId)}`);
}
