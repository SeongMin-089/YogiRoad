import { requestJson } from './apiClient';
import type { RestaurantLicenseCandidate } from '../types/sales';

export function getRestaurantLicenseCandidates(
  region: string,
  signal?: AbortSignal,
): Promise<RestaurantLicenseCandidate[]> {
  const cleanRegion = region.trim();
  if (!cleanRegion) return Promise.resolve([]);
  return requestJson(
    `/api/sales-targets/license-candidates?region=${encodeURIComponent(cleanRegion)}`,
    { signal },
  );
}
