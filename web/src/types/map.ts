import type { SalesStatus } from './sales';

export type MapCenter = { latitude: number; longitude: number };

export type PublicDataStore = {
  bizesId?: string;
  bizesNm?: string;
  brchNm?: string;
  bldNm?: string;
  flrNo?: string;
  indsLclsCd?: string;
  indsLclsNm?: string;
  indsMclsCd?: string;
  indsMclsNm?: string;
  indsSclsCd?: string;
  indsSclsNm?: string;
  ctprvnNm?: string;
  signguNm?: string;
  adongNm?: string;
  lnoAdr?: string;
  rdnmAdr?: string;
  lon?: number;
  lat?: number;
};

export type KakaoMapStore = PublicDataStore & {
  bizesId: string;
  bizesNm: string;
  salesStatus?: SalesStatus;
  markerKind?: 'standard' | 'licenseCandidate';
  geocodeAddress?: string;
};

export type KakaoPlaceSearchResult = {
  id: string;
  name: string;
  address: string;
  roadAddress: string;
  categoryName: string;
  latitude: number;
  longitude: number;
};

export type RegionSearchRequest = { id: number; query: string };
export type RegionSearchStatus = 'ok' | 'zero' | 'error';
