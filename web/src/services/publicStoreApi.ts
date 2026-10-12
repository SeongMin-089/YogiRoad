import { ApiError, requestJson } from './apiClient';
import type { PublicDataStore } from '../types/map';

export { ApiError as PublicStoreApiError } from './apiClient';

export const DEFAULT_RESTAURANT_SEARCH = {
  latitude: 37.7336614,
  longitude: 127.2121189,
  radius: 1000,
  pageNo: 1,
  numOfRows: 100,
} as const;

export type RestaurantSearchOptions = {
  latitude?: number;
  longitude?: number;
  radius?: number;
  pageNo?: number;
  numOfRows?: number;
  signal?: AbortSignal;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return value;
}

function normalizeStore(value: unknown): PublicDataStore | null {
  if (!isRecord(value)) return null;
  return {
    bizesId: optionalString(value.bizesId),
    bizesNm: optionalString(value.bizesNm),
    brchNm: optionalString(value.brchNm),
    bldNm: optionalString(value.bldNm),
    flrNo: optionalString(value.flrNo),
    indsLclsCd: optionalString(value.indsLclsCd),
    indsLclsNm: optionalString(value.indsLclsNm),
    indsMclsCd: optionalString(value.indsMclsCd),
    indsMclsNm: optionalString(value.indsMclsNm),
    indsSclsCd: optionalString(value.indsSclsCd),
    indsSclsNm: optionalString(value.indsSclsNm),
    ctprvnNm: optionalString(value.ctprvnNm),
    signguNm: optionalString(value.signguNm),
    adongNm: optionalString(value.adongNm),
    lnoAdr: optionalString(value.lnoAdr),
    rdnmAdr: optionalString(value.rdnmAdr),
    lon: optionalNumber(value.lon),
    lat: optionalNumber(value.lat),
  };
}

function validateOptions(latitude: number, longitude: number, radius: number, pageNo: number, numOfRows: number) {
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90
      || !Number.isFinite(longitude) || Math.abs(longitude) > 180) {
    throw new ApiError('INVALID_RESPONSE', '검색 중심 좌표가 올바르지 않습니다.');
  }
  if (!Number.isInteger(radius) || radius < 1 || radius > 2000
      || !Number.isInteger(pageNo) || pageNo < 1
      || !Number.isInteger(numOfRows) || numOfRows < 1 || numOfRows > 100) {
    throw new ApiError('INVALID_RESPONSE', '음식점 조회 조건이 올바르지 않습니다.');
  }
}

export async function fetchRestaurantsInRadius(
  options: RestaurantSearchOptions = {},
): Promise<PublicDataStore[]> {
  const {
    latitude = DEFAULT_RESTAURANT_SEARCH.latitude,
    longitude = DEFAULT_RESTAURANT_SEARCH.longitude,
    radius = DEFAULT_RESTAURANT_SEARCH.radius,
    pageNo = DEFAULT_RESTAURANT_SEARCH.pageNo,
    numOfRows = DEFAULT_RESTAURANT_SEARCH.numOfRows,
    signal,
  } = options;
  validateOptions(latitude, longitude, radius, pageNo, numOfRows);

  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    radius: String(radius),
    pageNo: String(pageNo),
    numOfRows: String(numOfRows),
  });
  const response = await requestJson<unknown>(`/api/sales-targets/public-stores?${params}`, { signal });
  if (!Array.isArray(response)) throw new ApiError('INVALID_RESPONSE', '음식점 목록 응답을 읽을 수 없습니다.');

  const seen = new Set<string>();
  return response.flatMap(value => {
    const store = normalizeStore(value);
    if (!store) return [];
    const id = store.bizesId;
    if (id && seen.has(id)) return [];
    if (id) seen.add(id);
    return [store];
  });
}
