import { fetchRestaurantsInRadius, PublicDataApiError } from './publicDataApi';

let started = false;

// Temporary standalone smoke test; no map/navigation dependency or automatic retries.
export async function runPublicDataApiTestOnce(): Promise<void> {
  if (!__DEV__ || started) return;
  started = true;
  try {
    const stores = await fetchRestaurantsInRadius();
    console.log(`[PublicDataAPI] success: ${stores.length} stores`);
    const first = stores[0];
    if (first) {
      const { bizesId, bizesNm, indsMclsNm, rdnmAdr, lon, lat } = first;
      console.log('[PublicDataAPI] first store:', { bizesId, bizesNm, indsMclsNm, rdnmAdr, lon, lat });
    }
  } catch (error) {
    if (error instanceof PublicDataApiError) {
      console.warn(`[PublicDataAPI] ${error.kind}: ${error.message}`);
    } else {
      console.warn('[PublicDataAPI] UNKNOWN_ERROR: 테스트 실행 중 오류가 발생했습니다.');
    }
  }
}
