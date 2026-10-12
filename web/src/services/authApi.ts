import { requestJson, requestPublicJson } from './apiClient';

export type AuthUser = {
  userId: string;
  provider: 'kakao';
  nickname: string;
  profileImageUrl: string | null;
};

type LoginSessionCreated = {
  loginId: string;
  loginUrl: string;
};

export type LoginSessionStatus = {
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED';
  accessToken?: string;
  message?: string;
};

export function createKakaoLoginSession(): Promise<LoginSessionCreated> {
  return requestPublicJson('/api/auth/kakao/session', { method: 'POST' });
}

export function getKakaoLoginSession(loginId: string): Promise<LoginSessionStatus> {
  return requestPublicJson(`/api/auth/kakao/session/${encodeURIComponent(loginId)}`);
}

export function getMe(): Promise<AuthUser> {
  return requestJson('/api/auth/me');
}
