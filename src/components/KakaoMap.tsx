import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { colors } from '../constants/colors';

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
};
type Props = { latitude?: number; longitude?: number; stores?: KakaoMapStore[]; onStorePress?: (storeId: string) => void };
const EMPTY_STORES: KakaoMapStore[] = [];

function serializeStores(stores: KakaoMapStore[]) {
  return JSON.stringify(stores).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

// 진접읍 경복대로 424: 남양주캠퍼스(경복대로 425) 인근 도로명주소 좌표.
// https://findby.co.kr/details/12051-413603197003-st-652bb41f8c641f9e38b0a65d
const DEFAULT_CENTER = { latitude: 37.7336614, longitude: 127.2121189 };
// Register https://localhost as a JavaScript SDK domain in Kakao Developers.
// This is the inline HTML's origin, not a server the phone needs to connect to.
const BASE_URL = 'https://localhost/';

function createMapHtml(apiKey: string, latitude: number, longitude: number, stores: KakaoMapStore[]) {
  const sdkUrl = JSON.stringify(
    `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(apiKey)}&autoload=false`,
  ).replace(/</g, '\\u003c');

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
      var stores = ${serializeStores(stores)};
      function send(type, code) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, code: code }));
        }
      }
      function fail(code) {
        if (failed) return;
        failed = true;
        send('MAP_ERROR', code);
      }
      var sdk = document.createElement('script');
      sdk.src = ${sdkUrl};
      sdk.onerror = function () {
        fail('SDK_LOAD_FAILED');
      };
      sdk.onload = function () {
        if (failed) return;
        if (!window.kakao || !window.kakao.maps) { fail('SDK_UNAVAILABLE'); return; }
        try {
          kakao.maps.load(function () {
            if (failed) return;
            try {
              var map = new kakao.maps.Map(document.getElementById('map'), {
                center: new kakao.maps.LatLng(${latitude}, ${longitude}),
                level: 4,
                draggable: true,
                zoomable: true
              });
              var markers = [];
              window.updateStoreMarkers = function (nextStores) {
                markers.forEach(function (entry) {
                  kakao.maps.event.removeListener(entry.marker, 'click', entry.onClick);
                  entry.marker.setMap(null);
                });
                markers = [];
                if (!Array.isArray(nextStores)) return;
                var seen = Object.create(null);
                nextStores.forEach(function (store) {
                  if (markers.length >= 20 || !store || typeof store.bizesId !== 'string' || !store.bizesId || seen[store.bizesId]) return;
                  if (typeof store.lat !== 'number' || typeof store.lon !== 'number' ||
                      !Number.isFinite(store.lat) || !Number.isFinite(store.lon) ||
                      Math.abs(store.lat) > 90 || Math.abs(store.lon) > 180) return;
                  var marker;
                  try {
                    marker = new kakao.maps.Marker({
                      map: map,
                      position: new kakao.maps.LatLng(store.lat, store.lon)
                    });
                    var onClick = function () {
                      if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'STORE_SELECTED', storeId: store.bizesId }));
                      }
                    };
                    kakao.maps.event.addListener(marker, 'click', onClick);
                    markers.push({ marker: marker, onClick: onClick });
                    seen[store.bizesId] = true;
                  } catch (_) {
                    // One malformed store must not stop the map or other markers.
                    if (marker) marker.setMap(null);
                  }
                });
              };
              window.updateStoreMarkers(stores);
              // A missing tile must not turn a successfully initialized map into a timeout error.
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

function MapWebView({ apiKey, latitude, longitude, stores, onStorePress }: {
  apiKey: string; latitude: number; longitude: number; stores: KakaoMapStore[]; onStorePress?: Props['onStorePress'];
}) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const webView = useRef<WebView>(null);
  const initialStores = useRef(stores);
  const source = useMemo(() => ({
    html: createMapHtml(apiKey, latitude, longitude, initialStores.current), baseUrl: BASE_URL,
  }), [apiKey, latitude, longitude]);

  // API completion updates only markers, preserving the user's pan/zoom and loaded SDK.
  useEffect(() => {
    if (status === 'ready') {
      webView.current?.injectJavaScript(`window.updateStoreMarkers && window.updateStoreMarkers(${serializeStores(stores)}); true;`);
    }
  }, [stores, status]);

  const fail = useCallback((code: string) => {
    // Never log the native event, URL, HTML, or SDK exception (they may include the key).
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
      if (!message || typeof message !== 'object' || !('type' in message)) return;
      if (message.type === 'MAP_READY') {
        setStatus(current => current === 'loading' ? 'ready' : current);
      } else if (message.type === 'STORE_SELECTED' && 'storeId' in message && typeof message.storeId === 'string') {
        const storeId = message.storeId;
        if (stores.some(store => store.bizesId === storeId)) onStorePress?.(storeId);
      } else if (message.type === 'MAP_ERROR') {
        const code = 'code' in message && typeof message.code === 'string' && errorCodes.has(message.code)
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
      // HTTP errors can belong to individual tiles/subresources. SDK failure and
      // initialization timeout handle fatal cases without aborting a usable map.
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

export default function KakaoMap({ latitude = DEFAULT_CENTER.latitude, longitude = DEFAULT_CENTER.longitude, stores = EMPTY_STORES, onStorePress }: Props) {
  const apiKey = process.env.EXPO_PUBLIC_KAKAO_JS_KEY?.trim();
  let message: string | undefined;
  if (!apiKey) message = '지도 설정 오류: EXPO_PUBLIC_KAKAO_JS_KEY를 설정해 주세요.';
  else if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    message = '지도 설정 오류: 중심 좌표를 확인해 주세요.';
  } else if (Platform.OS === 'web') message = '카카오 지도는 iPhone 또는 Android의 Expo Go에서 확인해 주세요.';

  if (message || !apiKey) return <View style={[styles.container, styles.notice]}><Text style={styles.description}>{message}</Text></View>;
  // A changed center starts a fresh map session; store changes update markers only.
  return <MapWebView key={`${latitude},${longitude}`} apiKey={apiKey} latitude={latitude} longitude={longitude} stores={stores} onStorePress={onStorePress} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 290, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  webview: { flex: 1, backgroundColor: colors.surface },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: colors.surface },
  notice: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: colors.text, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  description: { color: colors.textSecondary, fontSize: 13, lineHeight: 21, textAlign: 'center' },
});
