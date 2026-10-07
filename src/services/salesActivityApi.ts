import type { SalesActivityType } from '../types/sales';
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
