import { useEffect, useRef, useState } from 'react';
import type {
  KakaoAddressResult,
  KakaoMapInstance,
  KakaoMapsApi,
  KakaoMarker,
  KakaoMarkerClusterer,
  KakaoPlace,
  KakaoRegion,
} from '../../types/kakao-maps';
import type {
  KakaoMapStore,
  KakaoPlaceSearchResult,
  MapCenter,
  RegionSearchRequest,
  RegionSearchStatus,
} from '../../types/map';
import type { SalesStatus } from '../../types/sales';
import styles from './KakaoMap.module.scss';

export const DEFAULT_CENTER: MapCenter = { latitude: 37.7336614, longitude: 127.2121189 };

type Props = {
  latitude?: number;
  longitude?: number;
  stores?: KakaoMapStore[];
  regionSearchRequest?: RegionSearchRequest | null;
  onStorePress?: (storeId: string, coordinate?: MapCenter) => void;
  onCenterIdle?: (center: MapCenter, userInitiated: boolean, regionName?: string) => void;
  onRegionSearchResult?: (
    requestId: number,
    results: KakaoPlaceSearchResult[],
    status: RegionSearchStatus,
  ) => void;
};

type MarkerEntry = { marker: KakaoMarker; onClick: () => void };

const SDK_ID = 'yogiroad-kakao-map-sdk';
let sdkPromise: Promise<KakaoMapsApi> | null = null;
let sdkAppKey: string | null = null;

function isCoordinate(latitude: unknown, longitude: unknown): latitude is number {
  return typeof latitude === 'number' && Number.isFinite(latitude) && Math.abs(latitude) <= 90
    && typeof longitude === 'number' && Number.isFinite(longitude) && Math.abs(longitude) <= 180;
}

function loadKakaoSdk(appKey: string): Promise<KakaoMapsApi> {
  if (window.kakao?.maps) {
    return new Promise(resolve => window.kakao!.maps.load(() => resolve(window.kakao!.maps)));
  }
  if (sdkPromise && sdkAppKey === appKey) return sdkPromise;

  sdkAppKey = appKey;
  sdkPromise = new Promise((resolve, reject) => {
    const finish = () => {
      if (!window.kakao?.maps) {
        reject(new Error('SDK_UNAVAILABLE'));
        return;
      }
      window.kakao.maps.load(() => resolve(window.kakao!.maps));
    };
    const fail = () => {
      sdkPromise = null;
      reject(new Error('SDK_LOAD_FAILED'));
    };

    const existing = document.getElementById(SDK_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', finish, { once: true });
      existing.addEventListener('error', fail, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = SDK_ID;
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false&libraries=services,clusterer`;
    script.addEventListener('load', finish, { once: true });
    script.addEventListener('error', fail, { once: true });
    document.head.appendChild(script);
  });
  return sdkPromise;
}

function markerColor(status?: SalesStatus): string {
  if (status === '계약완료') return '#16A34A';
  if (status === '상담중') return '#F59E0B';
  if (status === '재방문') return '#8B5CF6';
  if (status === '미방문') return '#64748B';
  if (status === '거절') return '#475569';
  return '#FF5A5F';
}

function markerImage(
  maps: KakaoMapsApi,
  cache: Map<string, unknown>,
  status: SalesStatus | undefined,
  kind: KakaoMapStore['markerKind'],
): unknown {
  const key = `${kind ?? 'standard'}:${status ?? 'unregistered'}`;
  const cached = cache.get(key);
  if (cached) return cached;

  if (kind === 'licenseCandidate') {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="46" height="52" viewBox="0 0 46 52">'
      + '<path d="M23 8C14.2 8 7 15.2 7 24c0 11.7 16 27 16 27s16-15.3 16-27C39 15.2 31.8 8 23 8z" fill="#16A34A" stroke="#FFFFFF" stroke-width="2"/>'
      + '<circle cx="23" cy="24" r="5" fill="#FFFFFF"/>'
      + '<rect x="10" y="1" width="26" height="14" rx="7" fill="#065F46" stroke="#FFFFFF" stroke-width="1.5"/>'
      + '<text x="23" y="11" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" font-weight="700" fill="#FFFFFF">NEW</text>'
      + '</svg>';
    const image = new maps.MarkerImage(
      `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      new maps.Size(46, 52),
      { offset: new maps.Point(23, 51) },
    );
    cache.set(key, image);
    return image;
  }

  const fill = markerColor(status);
  const centerFill = status ? '#FFFFFF' : '#F6F7F9';
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44">'
    + `<path d="M17 1C8.2 1 1 8.2 1 17c0 11.7 16 26 16 26s16-14.3 16-26C33 8.2 25.8 1 17 1z" fill="${fill}" stroke="#FFFFFF" stroke-width="2"/>`
    + `<circle cx="17" cy="17" r="6" fill="${centerFill}"/>`
    + (status ? `<path d="M14 17l2 2 4-5" fill="none" stroke="${fill}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` : '')
    + '</svg>';
  const image = new maps.MarkerImage(
    `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    new maps.Size(34, 44),
    { offset: new maps.Point(17, 43) },
  );
  cache.set(key, image);
  return image;
}

export function KakaoMap({
  latitude = DEFAULT_CENTER.latitude,
  longitude = DEFAULT_CENTER.longitude,
  stores = [],
  regionSearchRequest,
  onStorePress,
  onCenterIdle,
  onRegionSearchResult,
}: Props) {
  const apiKey = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY?.trim();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const mapsRef = useRef<KakaoMapsApi | null>(null);
  const geocoderRef = useRef<InstanceType<KakaoMapsApi['services']['Geocoder']> | null>(null);
  const placesRef = useRef<InstanceType<KakaoMapsApi['services']['Places']> | null>(null);
  const clustererRef = useRef<KakaoMarkerClusterer | null>(null);
  const markerEntriesRef = useRef<MarkerEntry[]>([]);
  const markerImageCacheRef = useRef(new Map<string, unknown>());
  const markerUpdateVersionRef = useRef(0);
  const lastRegionRequestIdRef = useRef(0);
  const idleVersionRef = useRef(0);
  const observedCenterRef = useRef<MapCenter>({ latitude, longitude });
  const userInteractionRef = useRef(false);
  const onStorePressRef = useRef(onStorePress);
  const onCenterIdleRef = useRef(onCenterIdle);
  const onRegionSearchResultRef = useRef(onRegionSearchResult);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(apiKey ? 'loading' : 'error');

  useEffect(() => { onStorePressRef.current = onStorePress; }, [onStorePress]);
  useEffect(() => { onCenterIdleRef.current = onCenterIdle; }, [onCenterIdle]);
  useEffect(() => { onRegionSearchResultRef.current = onRegionSearchResult; }, [onRegionSearchResult]);

  useEffect(() => {
    if (!apiKey || !containerRef.current || !isCoordinate(latitude, longitude)) {
      setStatus('error');
      return;
    }
    let active = true;
    let resizeObserver: ResizeObserver | null = null;
    let maps: KakaoMapsApi | null = null;
    let map: KakaoMapInstance | null = null;

    const dragStart = () => { userInteractionRef.current = true; };
    const zoomStart = () => { userInteractionRef.current = true; };
    const idle = () => {
      if (!map || !maps) return;
      const centerValue = map.getCenter();
      const center = { latitude: centerValue.getLat(), longitude: centerValue.getLng() };
      const userInitiated = userInteractionRef.current;
      const idleVersion = ++idleVersionRef.current;
      observedCenterRef.current = center;
      userInteractionRef.current = false;
      geocoderRef.current?.coord2RegionCode(
        center.longitude,
        center.latitude,
        (regions: KakaoRegion[], resultStatus: string) => {
          if (!active || idleVersion !== idleVersionRef.current) return;
          let regionName = '';
          if (resultStatus === maps!.services.Status.OK && Array.isArray(regions)) {
            const region = regions.find(item => item.region_type === 'H') ?? regions[0];
            if (region) {
              regionName = [region.region_1depth_name, region.region_2depth_name].filter(Boolean).join(' ');
            }
          }
          onCenterIdleRef.current?.(center, userInitiated, regionName || undefined);
        },
      );
    };

    void loadKakaoSdk(apiKey).then(loadedMaps => {
      if (!active || !containerRef.current) return;
      maps = loadedMaps;
      map = new maps.Map(containerRef.current, {
        center: new maps.LatLng(latitude, longitude),
        level: 4,
        draggable: true,
        scrollwheel: true,
      });
      mapsRef.current = maps;
      mapRef.current = map;
      geocoderRef.current = new maps.services.Geocoder();
      placesRef.current = new maps.services.Places();
      clustererRef.current = maps.MarkerClusterer
        ? new maps.MarkerClusterer({ map, averageCenter: true, minLevel: 5, minClusterSize: 3 })
        : null;
      maps.event.addListener(map, 'dragstart', dragStart);
      maps.event.addListener(map, 'zoom_start', zoomStart);
      maps.event.addListener(map, 'idle', idle);
      resizeObserver = new ResizeObserver(() => map?.relayout());
      resizeObserver.observe(containerRef.current);
      setStatus('ready');
    }).catch(() => {
      if (active) setStatus('error');
    });

    const timeout = window.setTimeout(() => {
      if (active && !mapRef.current) setStatus('error');
    }, 20_000);

    return () => {
      active = false;
      window.clearTimeout(timeout);
      idleVersionRef.current += 1;
      markerUpdateVersionRef.current += 1;
      resizeObserver?.disconnect();
      if (maps && map) {
        maps.event.removeListener(map, 'dragstart', dragStart);
        maps.event.removeListener(map, 'zoom_start', zoomStart);
        maps.event.removeListener(map, 'idle', idle);
        markerEntriesRef.current.forEach(entry => {
          maps!.event.removeListener(entry.marker, 'click', entry.onClick);
          entry.marker.setMap(null);
        });
      }
      markerEntriesRef.current = [];
      clustererRef.current?.clear();
      clustererRef.current = null;
      geocoderRef.current = null;
      placesRef.current = null;
      mapRef.current = null;
      mapsRef.current = null;
      if (containerRef.current) containerRef.current.replaceChildren();
    };
  // 지도 인스턴스는 SDK 키가 바뀔 때만 다시 생성합니다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  useEffect(() => {
    if (status !== 'ready' || !mapRef.current || !mapsRef.current || !isCoordinate(latitude, longitude)) return;
    const current = observedCenterRef.current;
    if (Math.abs(current.latitude - latitude) < 0.0000001
        && Math.abs(current.longitude - longitude) < 0.0000001) return;
    observedCenterRef.current = { latitude, longitude };
    mapRef.current.setCenter(new mapsRef.current.LatLng(latitude, longitude));
  }, [latitude, longitude, status]);

  useEffect(() => {
    if (status !== 'ready' || !mapsRef.current || !mapRef.current) return;
    const maps = mapsRef.current;
    const map = mapRef.current;
    const clusterer = clustererRef.current;
    const version = ++markerUpdateVersionRef.current;

    markerEntriesRef.current.forEach(entry => {
      maps.event.removeListener(entry.marker, 'click', entry.onClick);
      entry.marker.setMap(null);
    });
    markerEntriesRef.current = [];
    clusterer?.clear();

    const seen = new Set<string>();
    const immediateMarkers: KakaoMarker[] = [];
    const addMarker = (store: KakaoMapStore, storeLatitude: number, storeLongitude: number, immediate: boolean) => {
      if (version !== markerUpdateVersionRef.current || !isCoordinate(storeLatitude, storeLongitude)) return;
      const marker = new maps.Marker({
        position: new maps.LatLng(storeLatitude, storeLongitude),
        title: store.bizesNm,
        image: markerImage(maps, markerImageCacheRef.current, store.salesStatus, store.markerKind),
      });
      const onClick = () => onStorePressRef.current?.(
        store.bizesId,
        { latitude: storeLatitude, longitude: storeLongitude },
      );
      maps.event.addListener(marker, 'click', onClick);
      markerEntriesRef.current.push({ marker, onClick });
      if (clusterer) {
        if (immediate) immediateMarkers.push(marker);
        else clusterer.addMarker(marker);
      } else {
        marker.setMap(map);
      }
    };

    stores.forEach(store => {
      if (!store.bizesId || seen.has(store.bizesId)) return;
      seen.add(store.bizesId);
      if (isCoordinate(store.lat, store.lon)) {
        addMarker(store, store.lat, store.lon as number, true);
      } else if (store.markerKind === 'licenseCandidate' && store.geocodeAddress?.trim()) {
        geocoderRef.current?.addressSearch(
          store.geocodeAddress.trim(),
          (results: KakaoAddressResult[], resultStatus: string) => {
            if (version !== markerUpdateVersionRef.current
                || resultStatus !== maps.services.Status.OK || !results[0]) return;
            addMarker(store, Number(results[0].y), Number(results[0].x), false);
          },
        );
      }
    });
    if (clusterer && immediateMarkers.length) clusterer.addMarkers(immediateMarkers);

    return () => {
      markerUpdateVersionRef.current += 1;
      markerEntriesRef.current.forEach(entry => {
        maps.event.removeListener(entry.marker, 'click', entry.onClick);
        entry.marker.setMap(null);
      });
      markerEntriesRef.current = [];
      clusterer?.clear();
    };
  }, [status, stores]);

  useEffect(() => {
    if (status !== 'ready' || !regionSearchRequest || !placesRef.current || !mapsRef.current
        || regionSearchRequest.id <= lastRegionRequestIdRef.current) return;
    const maps = mapsRef.current;
    const { id, query } = regionSearchRequest;
    lastRegionRequestIdRef.current = id;
    placesRef.current.keywordSearch(query.trim(), (data: KakaoPlace[], resultStatus: string) => {
      if (id !== lastRegionRequestIdRef.current) return;
      if (resultStatus === maps.services.Status.ZERO_RESULT) {
        onRegionSearchResultRef.current?.(id, [], 'zero');
        return;
      }
      if (resultStatus !== maps.services.Status.OK || !Array.isArray(data)) {
        onRegionSearchResultRef.current?.(id, [], 'error');
        return;
      }
      const results = data.slice(0, 10).flatMap(place => {
        const resultLatitude = Number(place.y);
        const resultLongitude = Number(place.x);
        if (!isCoordinate(resultLatitude, resultLongitude)) return [];
        return [{
          id: String(place.id ?? ''),
          name: String(place.place_name ?? ''),
          address: String(place.address_name ?? ''),
          roadAddress: String(place.road_address_name ?? ''),
          categoryName: String(place.category_name ?? ''),
          latitude: resultLatitude,
          longitude: resultLongitude,
        }];
      });
      onRegionSearchResultRef.current?.(id, results, results.length ? 'ok' : 'zero');
    }, { size: 10, sort: maps.services.SortBy.ACCURACY });
  }, [regionSearchRequest, status]);

  const configurationMessage = !apiKey
    ? '지도 설정 오류: VITE_KAKAO_JAVASCRIPT_KEY를 설정해 주세요.'
    : !isCoordinate(latitude, longitude)
      ? '지도 설정 오류: 중심 좌표를 확인해 주세요.'
      : null;

  return (
    <div className={styles.container}>
      <div ref={containerRef} className={styles.map} role="application" aria-label="카카오 지도" />
      {status !== 'ready' && (
        <div className={styles.overlay} role="status">
          {status === 'loading' && <span className="spinner" aria-hidden="true" />}
          <strong>{status === 'loading' ? '지도를 불러오는 중...' : '지도를 불러오지 못했습니다.'}</strong>
          {status === 'error' && (
            <span>{configurationMessage ?? '네트워크 연결과 카카오 키·등록 도메인을 확인해 주세요.'}</span>
          )}
        </div>
      )}
    </div>
  );
}
