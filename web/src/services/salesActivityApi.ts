import { requestJson, requestNoContent } from './apiClient';
import type { CreateSalesActivityRequest, SalesActivity, UpcomingSalesAction } from '../types/sales';

function activitiesPath(storeId: string): string {
  return `/api/sales-targets/${encodeURIComponent(storeId)}/activities`;
}

export function getSalesActivities(storeId: string): Promise<SalesActivity[]> {
  return requestJson(activitiesPath(storeId));
}

export function createSalesActivity(storeId: string, body: CreateSalesActivityRequest): Promise<SalesActivity> {
  return requestJson(activitiesPath(storeId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function deleteSalesActivity(storeId: string, activityId: string): Promise<void> {
  return requestNoContent(`${activitiesPath(storeId)}/${encodeURIComponent(activityId)}`, { method: 'DELETE' });
}

export function getUpcomingSalesActions(): Promise<UpcomingSalesAction[]> {
  return requestJson('/api/sales-activities/upcoming');
}
