import { ApiError, requestJson } from './apiClient';

export { ApiError as RestaurantLicenseApiError } from './apiClient';

export type RestaurantLicenseCandidate = {
  managementNumber: string;
  storeId: string;
  storeName: string;
  licenseDate: string;
  statusCode: string;
  statusName: string;
  businessType: string;
  address: string;
  roadAddress: string;
  lotNumberAddress: string;
  telephone: string;
  latitude: number | null;
  longitude: number | null;
  coordinateSource: 'EPSG_5174' | 'ADDRESS_REQUIRED';
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function string(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function coordinate(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export async function getRestaurantLicenseCandidates(
  region: string,
  signal?: AbortSignal,
): Promise<RestaurantLicenseCandidate[]> {
  const cleanRegion = region.trim();
  if (!cleanRegion) return [];
  const response = await requestJson<unknown>(
    `/api/sales-targets/license-candidates?region=${encodeURIComponent(cleanRegion)}`,
    { signal },
  );
  if (!Array.isArray(response)) {
    throw new ApiError('INVALID_RESPONSE', '신규 인허가 후보 응답을 읽을 수 없습니다.');
  }
  return response.flatMap(item => {
    if (!isRecord(item)) return [];
    const managementNumber = string(item.managementNumber);
    const storeId = string(item.storeId);
    const storeName = string(item.storeName);
    const licenseDate = string(item.licenseDate);
    if (!managementNumber || !storeId || !storeName || !licenseDate) return [];
    const latitude = coordinate(item.latitude);
    const longitude = coordinate(item.longitude);
    return [{
      managementNumber,
      storeId,
      storeName,
      licenseDate,
      statusCode: string(item.statusCode),
      statusName: string(item.statusName),
      businessType: string(item.businessType),
      address: string(item.address),
      roadAddress: string(item.roadAddress),
      lotNumberAddress: string(item.lotNumberAddress),
      telephone: string(item.telephone),
      latitude,
      longitude,
      coordinateSource: item.coordinateSource === 'EPSG_5174' ? 'EPSG_5174' : 'ADDRESS_REQUIRED',
    }];
  });
}
