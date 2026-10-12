import { requestJson, requestNoContent } from './apiClient';
import type {
  CreateSalesTargetRequest,
  SalesPriority,
  SalesTarget,
  UpdateSalesTargetRequest,
} from '../types/sales';

export function getSalesTargets(): Promise<SalesTarget[]> {
  return requestJson('/api/sales-targets');
}

export function getSalesTarget(storeId: string): Promise<SalesTarget> {
  return requestJson(`/api/sales-targets/${encodeURIComponent(storeId)}`);
}

export function createSalesTarget(body: CreateSalesTargetRequest): Promise<SalesTarget> {
  return requestJson('/api/sales-targets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function updateSalesTarget(storeId: string, body: UpdateSalesTargetRequest): Promise<SalesTarget> {
  return requestJson(`/api/sales-targets/${encodeURIComponent(storeId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function deleteSalesTarget(storeId: string): Promise<void> {
  return requestNoContent(`/api/sales-targets/${encodeURIComponent(storeId)}`, { method: 'DELETE' });
}

export function getSalesPriorities(): Promise<SalesPriority[]> {
  return requestJson('/api/sales-targets/priorities');
}
