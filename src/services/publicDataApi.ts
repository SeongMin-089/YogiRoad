// API reference: https://www.data.go.kr/data/15012005/openapi.do
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

type ErrorKind = 'MISSING_KEY' | 'INVALID_KEY_ENCODING' | 'NETWORK_ERROR' | 'HTTP_ERROR'
  | 'JSON_PARSE_ERROR' | 'API_ERROR' | 'INVALID_RESPONSE' | 'NO_ITEMS';

export class PublicDataApiError extends Error {
  constructor(public readonly kind: ErrorKind, message: string) {
    super(message);
    this.name = 'PublicDataApiError';
  }
}

const ENDPOINT = 'https://apis.data.go.kr/B553077/api/open/sdsc2/storeListInRadius';
const stringFields = [
  'bizesId', 'bizesNm', 'brchNm', 'indsLclsCd', 'indsLclsNm', 'indsMclsCd',
  'indsMclsNm', 'indsSclsCd', 'indsSclsNm', 'ctprvnNm', 'signguNm', 'adongNm',
  'lnoAdr', 'rdnmAdr', 'bldNm', 'flrNo',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Only known server messages may reach logs; never echo arbitrary server text/URLs.
const apiMessages: Record<string, string> = {
  APPLICATION_ERROR: '제공기관 내부 오류',
  HTTP_ERROR: '제공기관 HTTP 처리 오류',
  SERVICETIMEOUT_ERROR: '제공기관 응답 시간 초과',
  INVALID_REQUEST_PARAMETER_ERROR: '요청 파라미터 오류',
  NO_OPENAPI_SERVICE_ERROR: 'API 서비스 경로 확인 필요',
  SERVICE_KEY_IS_NULL: '인증키 누락',
  PERMISSION_DENIED: '활용신청 권한 확인 필요',
  SERVICE_ACCESS_DENIED_ERROR: '서비스 이용 권한 확인 필요',
  SERVICE_KEY_IS_NOT_REGISTERED_ERROR: '키 등록 및 활용신청 승인 확인 필요',
  DEADLINE_HAS_EXPIRED_ERROR: '인증키 사용 기간 만료',
  LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR: '일일 호출 한도 초과',
  LIMITED_NUMBER_OF_SERVICE_REQUESTS_PER_SECOND_EXCEEDS_ERROR: '초당 호출 한도 초과',
  NORMAL_SERVICE: '정상 서비스',
};

function apiError(code: unknown, message: unknown): PublicDataApiError {
  const safeCode = typeof code === 'string' && /^\d{1,3}$/.test(code) ? code : 'UNKNOWN';
  const label = typeof message === 'string' ? message.trim().replace(/\s+/g, '_') : '';
  const description = Object.prototype.hasOwnProperty.call(apiMessages, label)
    ? apiMessages[label] : '제공기관 오류 응답(resultMsg 원문은 보안상 생략)';
  return new PublicDataApiError('API_ERROR', `resultCode=${safeCode}: ${description}`);
}

function normalizeStore(item: unknown): PublicDataStore {
  if (!isRecord(item)) throw new PublicDataApiError('INVALID_RESPONSE', 'items 항목이 객체가 아닙니다.');
  const store: PublicDataStore = {};
  for (const field of stringFields) {
    if (typeof item[field] === 'string') store[field] = item[field];
  }
  if (typeof item.flrNo === 'number' && Number.isFinite(item.flrNo)) store.flrNo = String(item.flrNo);
  for (const field of ['lon', 'lat'] as const) {
    const value = item[field];
    if (typeof value === 'number' || (typeof value === 'string' && value.trim())) {
      const number = Number(value);
      if (Number.isFinite(number)) store[field] = number;
    }
  }
  return store;
}

export async function fetchRestaurantsInRadius(): Promise<PublicDataStore[]> {
  const configuredKey = process.env.EXPO_PUBLIC_PUBLIC_DATA_KEY?.trim();
  if (!configuredKey) throw new PublicDataApiError('MISSING_KEY', 'EXPO_PUBLIC_PUBLIC_DATA_KEY를 설정해 주세요.');

  // Accept either the portal's Encoding key or Decoding key; encode exactly once.
  let serviceKey: string;
  try {
    serviceKey = decodeURIComponent(configuredKey);
  } catch {
    throw new PublicDataApiError('INVALID_KEY_ENCODING', '인증키의 URL 인코딩 형식을 확인해 주세요.');
  }
  const params = new URLSearchParams({
    serviceKey, cx: '127.2121189', cy: '37.7336614', radius: '1000',
    indsLclsCd: 'I2', numOfRows: '20', pageNo: '1', type: 'json',
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  let text: string;
  try {
    const response = await fetch(`${ENDPOINT}?${params.toString()}`, { signal: controller.signal });
    if (!response.ok) throw new PublicDataApiError('HTTP_ERROR', `HTTP ${response.status}`);
    text = await response.text();
  } catch (error) {
    if (error instanceof PublicDataApiError) throw error;
    // Native fetch errors can include the request URL, so never forward them.
    throw new PublicDataApiError('NETWORK_ERROR', controller.signal.aborted
      ? '요청 시간이 20초를 초과했습니다.' : '네트워크 연결 또는 제공기관 접속을 확인해 주세요.');
  } finally {
    clearTimeout(timeout);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    // The public-data gateway can return XML authentication errors even for type=json.
    if (text.includes('<OpenAPI_ServiceResponse>')) {
      throw apiError(text.match(/<returnReasonCode>([^<]*)<\/returnReasonCode>/)?.[1],
        text.match(/<returnAuthMsg>([^<]*)<\/returnAuthMsg>/)?.[1]);
    }
    throw new PublicDataApiError('JSON_PARSE_ERROR', 'JSON 응답이 아닙니다. 인증 및 제공기관 응답 형식을 확인해 주세요.');
  }
  const root = isRecord(parsed) && isRecord(parsed.response) ? parsed.response : parsed;
  if (!isRecord(root) || !isRecord(root.header)) {
    throw new PublicDataApiError('INVALID_RESPONSE', '응답 header가 없습니다.');
  }
  const { resultCode, resultMsg } = root.header;
  if (resultCode !== '00' && resultCode !== 0) throw apiError(resultCode, resultMsg);
  const items: unknown = isRecord(root.body) ? root.body.items : undefined;
  const rows: unknown = isRecord(items) ? items.item : items;
  if (rows === undefined || rows === null || rows === '' || (Array.isArray(rows) && rows.length === 0)) {
    throw new PublicDataApiError('NO_ITEMS', '반경 1km 내 음식점 items가 없습니다.');
  }
  if (!Array.isArray(rows)) throw new PublicDataApiError('INVALID_RESPONSE', 'items가 배열이 아닙니다.');
  return rows.map(normalizeStore);
}
