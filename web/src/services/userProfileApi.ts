import { requestJson } from './apiClient';
import type { UpdateUserProfileRequest, UserProfile } from '../types/userProfile';

export function getUserProfile(): Promise<UserProfile> {
  return requestJson('/api/users/me/profile');
}

export function updateUserProfile(body: UpdateUserProfileRequest): Promise<UserProfile> {
  return requestJson('/api/users/me/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
