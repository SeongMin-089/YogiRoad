import type { SalesActivityType, SalesStatus } from '../types/sales';
import { requestJson, requestNoContent } from './apiClient';

export { ApiError as SalesActivityApiError } from './apiClient';

export type SalesActivity = {
  id: string;
  storeId: string;
  type: SalesActivityType;
  content: string;
  nextActionAt: string | null;
  createdAt: string;
};

export type CreateSalesActivityRequest = {
  type: SalesActivityType;
  content: string;
  nextActionAt: string | null;
};

export type UpcomingSalesAction = {
  activityId: string;
  storeId: string;
  storeName: string;
  category: string;
  address: string;
  status: SalesStatus;
  type: SalesActivityType;
  content: string;
  nextActionAt: string;
};

function activitiesPath(storeId: string): string {
  return `/api/sales-targets/${encodeURIComponent(storeId)}/activities`;
}

export function getSalesActivities(storeId: string): Promise<SalesActivity[]> {
  return requestJson(activitiesPath(storeId));
}

export function createSalesActivity(
  storeId: string,
  requestBody: CreateSalesActivityRequest,
): Promise<SalesActivity> {
  return requestJson(activitiesPath(storeId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });
}

export async function deleteSalesActivity(storeId: string, activityId: string): Promise<void> {
  await requestNoContent(
    `${activitiesPath(storeId)}/${encodeURIComponent(activityId)}`,
    { method: 'DELETE' },
  );
}

export function getUpcomingSalesActions(): Promise<UpcomingSalesAction[]> {
  return requestJson('/api/sales-activities/upcoming');
}
