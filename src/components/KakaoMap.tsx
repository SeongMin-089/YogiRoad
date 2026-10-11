import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { colors } from '../constants/colors';
import type { SalesStatus } from '../types/sales';

export type MapCenter = { latitude: number; longitude: number };

export type KakaoMapStore = {
  bizesId: string;
  bizesNm: string;
  indsLclsNm?: string;
  indsMclsNm?: string;
  indsSclsNm?: string;
  rdnmAdr?: string;
  lnoAdr?: string;
  lat: number;
  lon: number;
  salesStatus?: SalesStatus;
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

type Props = {
  latitude?: number;
  longitude?: number;
  stores?: KakaoMapStore[];
  regionSearchRequest?: RegionSearchRequest | null;
  onStorePress?: (storeId: string) => void;
  onCenterIdle?: (center: MapCenter, userInitiated: boolean) => void;
  onRegionSearchResult?: (
    requestId: number,
    results: KakaoPlaceSearchResult[],
    status: RegionSearchStatus,
  ) => void;
};

const EMPTY_STORES: KakaoMapStore[] = [];

function serialize(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

// 진접읍 경복대로 424: 남양주캠퍼스(경복대로 425) 인근 도로명주소 좌표.
export const DEFAULT_CENTER: MapCenter = { latitude: 37.7336614, longitude: 127.2121189 };
// Register https://localhost as a JavaScript SDK domain in Kakao Developers.
// This is the inline HTML's origin, not a server the phone needs to connect to.
const BASE_URL = 'https://localhost/';

function createMapHtml(apiKey: string, center: MapCenter, stores: KakaoMapStore[]) {
  const sdkUrl = serialize(
    `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(apiKey)}&autoload=false&libraries=services,clusterer`,
  );

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; }
    html, body { overflow: hidden; background: ${colors.surface}; }
  </style>
</head>
<body>
  <div id="map" aria-label="카카오 지도"></div>
  <script>
    (function () {
      var failed = false;
      var initialStores = ${serialize(stores)};
      var currentRegionRequestId = 0;
      function send(type, payload) {
        if (!window.ReactNativeWebView) return;
        var message = payload || {};
        message.type = type;
        window.ReactNativeWebView.postMessage(JSON.stringify(message));
      }
      function fail(code) {
        if (failed) return;
        failed = true;
        send('MAP_ERROR', { code: code });
      }
      var sdk = document.createElement('script');
      sdk.src = ${sdkUrl};
      sdk.onerror = function () { fail('SDK_LOAD_FAILED'); };
      sdk.onload = function () {
        if (failed) return;
        if (!window.kakao || !window.kakao.maps) { fail('SDK_UNAVAILABLE'); return; }
        try {
          kakao.maps.load(function () {
            if (failed) return;
            try {
              var map = new kakao.maps.Map(document.getElementById('map'), {
                center: new kakao.maps.LatLng(${center.latitude}, ${center.longitude}),
                level: 4,
                draggable: true,
                zoomable: true
              });
              var markerEntries = [];
              var markerImageCache = Object.create(null);
              var userInteraction = false;
              var places = new kakao.maps.services.Places();
              var clusterer = kakao.maps.MarkerClusterer ? new kakao.maps.MarkerClusterer({
                map: map,
                averageCenter: true,
                minLevel: 5,
                minClusterSize: 3
              }) : null;

              function markerColor(status) {
                if (status === '계약완료') return '#16A34A';
                if (status === '상담중') return '#F59E0B';
                if (status === '재방문') return '#8B5CF6';
                if (status === '미방문') return '#64748B';
                if (status === '거절') return '#475569';
                return '${colors.primary}';
              }
              function markerImage(status) {
                var key = status || 'unregistered';
                if (markerImageCache[key]) return markerImageCache[key];
                var fill = markerColor(status);
                var centerFill = status ? '#FFFFFF' : '${colors.surface}';
                var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44">' +
                  '<path d="M17 1C8.2 1 1 8.2 1 17c0 11.7 16 26 16 26s16-14.3 16-26C33 8.2 25.8 1 17 1z" fill="' + fill + '" stroke="#FFFFFF" stroke-width="2"/>' +
                  '<circle cx="17" cy="17" r="6" fill="' + centerFill + '"/>' +
                  (status ? '<path d="M14 17l2 2 4-5" fill="none" stroke="' + fill + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' : '') +
                  '</svg>';
                var source = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
                markerImageCache[key] = new kakao.maps.MarkerImage(
                  source,
                  new kakao.maps.Size(34, 44),
                  { offset: new kakao.maps.Point(17, 43) }
                );
                return markerImageCache[key];
              }

              window.updateStoreMarkers = function (nextStores) {
                markerEntries.forEach(function (entry) {
                  kakao.maps.event.removeListener(entry.marker, 'click', entry.onClick);
                  entry.marker.setMap(null);
                });
                markerEntries = [];
                if (clusterer) clusterer.clear();
                if (!Array.isArray(nextStores)) return;

                var seen = Object.create(null);
                var nextMarkers = [];
                nextStores.forEach(function (store) {
                  if (!store || typeof store.bizesId !== 'string' || !store.bizesId || seen[store.bizesId]) return;
                  if (typeof store.lat !== 'number' || typeof store.lon !== 'number' ||
                      !Number.isFinite(store.lat) || !Number.isFinite(store.lon) ||
                      Math.abs(store.lat) > 90 || Math.abs(store.lon) > 180) return;
                  var marker;
                  try {
                    marker = new kakao.maps.Marker({
                      position: new kakao.maps.LatLng(store.lat, store.lon),
                      title: typeof store.bizesNm === 'string' ? store.bizesNm : '',
                      image: markerImage(store.salesStatus)
                    });
                    var onClick = function () { send('STORE_SELECTED', { storeId: store.bizesId }); };
                    kakao.maps.event.addListener(marker, 'click', onClick);
                    markerEntries.push({ marker: marker, onClick: onClick });
                    nextMarkers.push(marker);
                    seen[store.bizesId] = true;
                  } catch (_) {
                    if (marker) marker.setMap(null);
                  }
                });
                if (clusterer) clusterer.addMarkers(nextMarkers);
                else nextMarkers.forEach(function (marker) { marker.setMap(map); });
              };

              window.moveMapCenter = function (latitude, longitude) {
                if (typeof latitude !== 'number' || typeof longitude !== 'number') return;
                map.setCenter(new kakao.maps.LatLng(latitude, longitude));
              };

              window.searchRegion = function (query, requestId) {
                if (typeof query !== 'string' || !query.trim() || typeof requestId !== 'number') return;
                currentRegionRequestId = requestId;
                places.keywordSearch(query.trim(), function (data, status) {
                  if (requestId !== currentRegionRequestId) return;
                  if (status === kakao.maps.services.Status.ZERO_RESULT) {
                    send('REGION_RESULTS', { requestId: requestId, status: 'zero', results: [] });
                    return;
                  }
                  if (status !== kakao.maps.services.Status.OK || !Array.isArray(data)) {
                    send('REGION_RESULTS', { requestId: requestId, status: 'error', results: [] });
                    return;
                  }
                  var results = data.slice(0, 10).map(function (place) {
                    return {
                      id: String(place.id || ''),
                      name: String(place.place_name || ''),
                      address: String(place.address_name || ''),
                      roadAddress: String(place.road_address_name || ''),
                      categoryName: String(place.category_name || ''),
                      latitude: Number(place.y),
                      longitude: Number(place.x)
                    };
                  }).filter(function (place) {
                    return Number.isFinite(place.latitude) && Number.isFinite(place.longitude);
                  });
                  send('REGION_RESULTS', { requestId: requestId, status: results.length ? 'ok' : 'zero', results: results });
                }, { size: 10, sort: kakao.maps.services.SortBy.ACCURACY });
              };

              kakao.maps.event.addListener(map, 'dragstart', function () { userInteraction = true; });
              kakao.maps.event.addListener(map, 'zoom_start', function () { userInteraction = true; });
              kakao.maps.event.addListener(map, 'idle', function () {
                var mapCenter = map.getCenter();
                send('CENTER_IDLE', {
                  latitude: mapCenter.getLat(),
                  longitude: mapCenter.getLng(),
                  userInitiated: userInteraction
                });
                userInteraction = false;
              });

              window.updateStoreMarkers(initialStores);
              send('MAP_READY');
              window.addEventListener('resize', function () { map.relayout(); });
            } catch (_) { fail('MAP_INIT_FAILED'); }
          });
        } catch (_) { fail('SDK_INIT_FAILED'); }
      };
      document.head.appendChild(sdk);
    })();
  </script>
</body>
</html>`;
}

const errorCodes = new Set([
  'SDK_LOAD_FAILED', 'SDK_UNAVAILABLE',
  'MAP_INIT_FAILED', 'SDK_INIT_FAILED',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isCoordinate(latitude: unknown, longitude: unknown): latitude is number {
  return typeof latitude === 'number' && Number.isFinite(latitude) && Math.abs(latitude) <= 90 &&
    typeof longitude === 'number' && Number.isFinite(longitude) && Math.abs(longitude) <= 180;
}

function parsePlaces(value: unknown): KakaoPlaceSearchResult[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    if (!isRecord(item) || !isCoordinate(item.latitude, item.longitude)) return [];
    return [{
      id: typeof item.id === 'string' ? item.id : '',
      name: typeof item.name === 'string' ? item.name : '',
      address: typeof item.address === 'string' ? item.address : '',
      roadAddress: typeof item.roadAddress === 'string' ? item.roadAddress : '',
      categoryName: typeof item.categoryName === 'string' ? item.categoryName : '',
      latitude: item.latitude,
      longitude: item.longitude as number,
    }];
  });
}

function MapWebView({
  apiKey,
  latitude,
  longitude,
  stores,
  regionSearchRequest,
  onStorePress,
  onCenterIdle,
  onRegionSearchResult,
}: Props & { apiKey: string; latitude: number; longitude: number; stores: KakaoMapStore[] }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const webView = useRef<WebView>(null);
  const initialState = useRef({ center: { latitude, longitude }, stores });
  const observedCenter = useRef<MapCenter>(initialState.current.center);
  const lastRegionRequestId = useRef(0);
  const source = useMemo(() => ({
    html: createMapHtml(apiKey, initialState.current.center, initialState.current.stores),
    baseUrl: BASE_URL,
  }), [apiKey]);

  useEffect(() => {
    if (status !== 'ready') return;
    webView.current?.injectJavaScript(
      `window.updateStoreMarkers && window.updateStoreMarkers(${serialize(stores)}); true;`,
    );
  }, [stores, status]);

  useEffect(() => {
    if (status !== 'ready') return;
    const current = observedCenter.current;
    if (Math.abs(current.latitude - latitude) < 0.0000001 &&
        Math.abs(current.longitude - longitude) < 0.0000001) return;
    observedCenter.current = { latitude, longitude };
    webView.current?.injectJavaScript(
      `window.moveMapCenter && window.moveMapCenter(${latitude}, ${longitude}); true;`,
    );
  }, [latitude, longitude, status]);

  useEffect(() => {
    if (status !== 'ready' || !regionSearchRequest ||
        regionSearchRequest.id <= lastRegionRequestId.current) return;
    lastRegionRequestId.current = regionSearchRequest.id;
    webView.current?.injectJavaScript(
      `window.searchRegion && window.searchRegion(${serialize(regionSearchRequest.query)}, ${regionSearchRequest.id}); true;`,
    );
  }, [regionSearchRequest, status]);

  const fail = useCallback((code: string) => {
    if (__DEV__) console.warn(`[KakaoMap] ${code}`);
    setStatus('error');
  }, []);

  useEffect(() => {
    if (status !== 'loading') return;
    const timer = setTimeout(() => fail('LOAD_TIMEOUT'), 20000);
    return () => clearTimeout(timer);
  }, [status, fail]);

  function onMessage(event: WebViewMessageEvent) {
    try {
      const message: unknown = JSON.parse(event.nativeEvent.data);
      if (!isRecord(message) || typeof message.type !== 'string') return;
      if (message.type === 'MAP_READY') {
        setStatus(current => current === 'loading' ? 'ready' : current);
      } else if (message.type === 'STORE_SELECTED' && typeof message.storeId === 'string') {
        if (stores.some(store => store.bizesId === message.storeId)) onStorePress?.(message.storeId);
      } else if (message.type === 'CENTER_IDLE' && isCoordinate(message.latitude, message.longitude)) {
        const center = { latitude: message.latitude, longitude: message.longitude as number };
        observedCenter.current = center;
        onCenterIdle?.(center, message.userInitiated === true);
      } else if (message.type === 'REGION_RESULTS' && typeof message.requestId === 'number') {
        const resultStatus: RegionSearchStatus = message.status === 'ok' || message.status === 'zero'
          ? message.status : 'error';
        onRegionSearchResult?.(message.requestId, parsePlaces(message.results), resultStatus);
      } else if (message.type === 'MAP_ERROR') {
        const code = typeof message.code === 'string' && errorCodes.has(message.code)
          ? message.code : 'SDK_ERROR';
        fail(code);
      }
    } catch { /* Ignore messages outside the map protocol. */ }
  }

  return <View style={styles.container}>
    {status !== 'error' ? <WebView
      ref={webView}
      source={source}
      originWhitelist={['*']}
      javaScriptEnabled
      scrollEnabled={false}
      bounces={false}
      nestedScrollEnabled
      style={styles.webview}
      onMessage={onMessage}
      onError={() => fail('WEBVIEW_LOAD_FAILED')}
      onHttpError={({ nativeEvent }) => {
        if (__DEV__) console.warn(`[KakaoMap] HTTP_${nativeEvent.statusCode}`);
      }}
      onContentProcessDidTerminate={() => fail('WEBVIEW_PROCESS_TERMINATED')}
      onRenderProcessGone={() => fail('WEBVIEW_PROCESS_GONE')}
    /> : null}
    {status !== 'ready' ? <View style={styles.overlay} accessibilityLiveRegion="polite">
      {status === 'loading' ? <ActivityIndicator color={colors.primary} /> : null}
      <Text style={styles.title}>{status === 'loading' ? '지도를 불러오는 중...' : '지도를 불러오지 못했습니다.'}</Text>
      {status === 'error' ? <Text style={styles.description}>네트워크 연결과 카카오 키·등록 도메인을 확인해 주세요.</Text> : null}
    </View> : null}
  </View>;
}

export default function KakaoMap({
  latitude = DEFAULT_CENTER.latitude,
  longitude = DEFAULT_CENTER.longitude,
  stores = EMPTY_STORES,
  ...props
}: Props) {
  const apiKey = process.env.EXPO_PUBLIC_KAKAO_JS_KEY?.trim();
  let message: string | undefined;
  if (!apiKey) message = '지도 설정 오류: EXPO_PUBLIC_KAKAO_JS_KEY를 설정해 주세요.';
  else if (!isCoordinate(latitude, longitude)) message = '지도 설정 오류: 중심 좌표를 확인해 주세요.';
  else if (Platform.OS === 'web') message = '카카오 지도는 iPhone 또는 Android의 Expo Go에서 확인해 주세요.';

  if (message || !apiKey) {
    return <View style={[styles.container, styles.notice]}><Text style={styles.description}>{message}</Text></View>;
  }
  return <MapWebView
    {...props}
    apiKey={apiKey}
    latitude={latitude}
    longitude={longitude}
    stores={stores}
  />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 330,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  webview: { flex: 1, backgroundColor: colors.surface },
  overlay: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
    alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24,
    backgroundColor: colors.surface,
  },
  notice: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: colors.text, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  description: { color: colors.textSecondary, fontSize: 13, lineHeight: 21, textAlign: 'center' },
});
