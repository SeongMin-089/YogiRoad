import { requestJson } from './apiClient';
import type { SalesDashboard } from '../types/sales';

export function getSalesDashboard(): Promise<SalesDashboard> {
  return requestJson('/api/sales-activities/dashboard');
}
