import type { SalesStatus } from '../types/sales';
import { requestJson, requestNoContent } from './apiClient';

export { ApiError as SalesTargetApiError } from './apiClient';

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
  sourceType?: string;
  sourceId?: string;
};

export type CreateSalesTargetRequest = {
  storeId: string;
  storeName: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  sourceType?: 'PUBLIC_STORE' | 'RESTAURANT_LICENSE';
  sourceId?: string;
};

export type UpdateSalesTargetRequest = {
  status: SalesStatus;
  memo: string;
};

export type SalesPriority = {
  storeId: string;
  storeName: string;
  category: string;
  address: string;
  status: SalesStatus;
  priorityScore: number;
  reason: string;
  nextActionAt: string | null;
};

export function createSalesTarget(requestBody: CreateSalesTargetRequest): Promise<SalesTarget> {
  return requestJson('/api/sales-targets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });
}

export function getSalesTargets(): Promise<SalesTarget[]> {
  return requestJson('/api/sales-targets');
}

export function getSalesTarget(storeId: string): Promise<SalesTarget> {
  return requestJson(`/api/sales-targets/${encodeURIComponent(storeId)}`);
}

export function updateSalesTarget(
  storeId: string,
  requestBody: UpdateSalesTargetRequest,
): Promise<SalesTarget> {
  return requestJson(`/api/sales-targets/${encodeURIComponent(storeId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });
}

export async function deleteSalesTarget(storeId: string): Promise<void> {
  await requestNoContent(`/api/sales-targets/${encodeURIComponent(storeId)}`, {
    method: 'DELETE',
  });
}

export function getSalesPriorities(): Promise<SalesPriority[]> {
  return requestJson('/api/sales-targets/priorities');
}
