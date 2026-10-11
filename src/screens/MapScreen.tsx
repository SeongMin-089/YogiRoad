import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MainScreenLayout, { ui } from '../components/MainScreenLayout';
import SearchField from '../components/SearchField';
import FilterChips from '../components/FilterChips';
import KakaoMap, {
  DEFAULT_CENTER,
  type KakaoMapStore,
  type KakaoPlaceSearchResult,
  type MapCenter,
  type RegionSearchRequest,
  type RegionSearchStatus,
} from '../components/KakaoMap';
import PublicStoreDetailsCard from '../components/PublicStoreDetailsCard';
import { colors } from '../constants/colors';
import {
  DEFAULT_RESTAURANT_SEARCH,
  fetchRestaurantsInRadius,
  PublicDataApiError,
  type PublicDataStore,
} from '../services/publicDataApi';
import { SALES_STATUSES, type SalesStatus } from '../types/sales';
import {
  createSalesTarget,
  getSalesTarget,
  getSalesTargets,
  SalesTargetApiError,
  type CreateSalesTargetRequest,
  type SalesTarget,
} from '../services/salesTargetApi';

const filters: readonly ('전체' | SalesStatus)[] = ['전체', ...SALES_STATUSES];
const SEARCH_RADIUS = DEFAULT_RESTAURANT_SEARCH.radius;
const PAGE_SIZE = DEFAULT_RESTAURANT_SEARCH.numOfRows;

function trimmed(value: string | undefined): string {
  return value?.trim() ?? '';
}

function toCreateSalesTargetRequest(store: PublicDataStore): CreateSalesTargetRequest | null {
  const storeId = trimmed(store.bizesId);
  const storeName = trimmed(store.bizesNm);
  const latitude = store.lat;
  const longitude = store.lon;

  if (!storeId || !storeName || typeof latitude !== 'number' || !Number.isFinite(latitude)
      || typeof longitude !== 'number' || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    storeId,
    storeName,
    category: trimmed(store.indsMclsNm) || trimmed(store.indsSclsNm),
    address: trimmed(store.rdnmAdr) || trimmed(store.lnoAdr),
    latitude,
    longitude,
  };
}

function storeRequestError(error: unknown): string {
  if (error instanceof PublicDataApiError &&
      (error.kind === 'MISSING_KEY' || error.kind === 'INVALID_KEY_ENCODING' || error.kind === 'INVALID_PARAMETER')) {
    return error.message;
  }
  return '주변 음식점을 불러오지 못했습니다. 지도를 이동한 뒤 다시 검색할 수 있습니다.';
}

export default function MapScreen() {
  const [storeQuery, setStoreQuery] = useState('');
  const [filter, setFilter] = useState<'전체' | SalesStatus>('전체');
  const [mapCenter, setMapCenter] = useState<MapCenter>(DEFAULT_CENTER);
  const [needsAreaSearch, setNeedsAreaSearch] = useState(false);
  const [regionQuery, setRegionQuery] = useState('');
  const [regionSearchRequest, setRegionSearchRequest] = useState<RegionSearchRequest | null>(null);
  const [regionSearchStatus, setRegionSearchStatus] = useState<'idle' | 'loading' | 'results' | 'zero' | 'error'>('idle');
  const [regionResults, setRegionResults] = useState<KakaoPlaceSearchResult[]>([]);
  const [selectedRegionName, setSelectedRegionName] = useState('남양주 진접');
  const [stores, setStores] = useState<PublicDataStore[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [selectedPublicStore, setSelectedPublicStore] = useState<PublicDataStore | null>(null);
  const [salesTargets, setSalesTargets] = useState<SalesTarget[]>([]);
  const [loadingSalesTargets, setLoadingSalesTargets] = useState(true);
  const [salesTargetError, setSalesTargetError] = useState<string | null>(null);
  const [registeringStoreId, setRegisteringStoreId] = useState<string | null>(null);
  const storeRequestVersion = useRef(0);
  const activeStoreRequest = useRef<{ key: string; controller: AbortController } | null>(null);
  const regionRequestId = useRef(0);

  const loadStores = useCallback(async (center: MapCenter): Promise<void> => {
    const requestKey = [
      center.latitude.toFixed(6),
      center.longitude.toFixed(6),
      SEARCH_RADIUS,
      DEFAULT_RESTAURANT_SEARCH.pageNo,
      PAGE_SIZE,
    ].join(':');
    const activeRequest = activeStoreRequest.current;
    if (activeRequest?.key === requestKey && !activeRequest.controller.signal.aborted) return;

    activeRequest?.controller.abort();
    const controller = new AbortController();
    activeStoreRequest.current = { key: requestKey, controller };
    const version = ++storeRequestVersion.current;
    setLoadingStores(true);
    setStoreError(null);
    setNeedsAreaSearch(false);
    setSelectedPublicStore(null);

    try {
      const result = await fetchRestaurantsInRadius({
        latitude: center.latitude,
        longitude: center.longitude,
        radius: SEARCH_RADIUS,
        pageNo: DEFAULT_RESTAURANT_SEARCH.pageNo,
        numOfRows: PAGE_SIZE,
        signal: controller.signal,
      });
      if (version !== storeRequestVersion.current) return;
      setStores(result);
      setStoreError(null);
    } catch (error) {
      if (version !== storeRequestVersion.current || controller.signal.aborted) return;
      setStoreError(storeRequestError(error));
      setNeedsAreaSearch(true);
    } finally {
      if (version === storeRequestVersion.current) {
        setLoadingStores(false);
        if (activeStoreRequest.current?.controller === controller) activeStoreRequest.current = null;
      }
    }
  }, []);

  useEffect(() => {
    void loadStores(DEFAULT_CENTER);
    return () => {
      storeRequestVersion.current += 1;
      activeStoreRequest.current?.controller.abort();
      activeStoreRequest.current = null;
    };
  }, [loadStores]);

  useEffect(() => {
    if (regionSearchStatus !== 'loading' || !regionSearchRequest) return;
    const pendingRequestId = regionSearchRequest.id;
    const timer = setTimeout(() => {
      if (regionRequestId.current !== pendingRequestId) return;
      setRegionResults([]);
      setRegionSearchStatus('error');
    }, 15000);
    return () => clearTimeout(timer);
  }, [regionSearchRequest, regionSearchStatus]);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoadingSalesTargets(true);
    void getSalesTargets().then(result => {
      if (active) {
        setSalesTargets(result);
        setSalesTargetError(null);
      }
    }).catch((error: unknown) => {
      if (!active) return;
      setSalesTargetError(error instanceof SalesTargetApiError
        ? error.message
        : '영업 대상 등록 상태를 불러오지 못했습니다. 지도는 계속 사용할 수 있습니다.');
    }).finally(() => {
      if (active) setLoadingSalesTargets(false);
    });
    return () => { active = false; };
  }, []));

  const salesTargetStatuses = useMemo(
    () => new Map(salesTargets.map(target => [target.storeId, target.status])),
    [salesTargets],
  );

  const visibleStores = useMemo(() => {
    const normalizedQuery = storeQuery.trim().toLocaleLowerCase('ko-KR');
    return stores.filter(store => {
      const storeId = trimmed(store.bizesId);
      const registeredStatus = storeId ? salesTargetStatuses.get(storeId) : undefined;
      const matchesStatus = filter === '전체' || registeredStatus === filter;
      const matchesQuery = !normalizedQuery || [
        store.bizesNm,
        store.rdnmAdr,
        store.lnoAdr,
        store.indsMclsNm,
        store.indsSclsNm,
      ].some(value => trimmed(value).toLocaleLowerCase('ko-KR').includes(normalizedQuery));
      return matchesStatus && matchesQuery;
    });
  }, [filter, salesTargetStatuses, storeQuery, stores]);

  const mapStores = useMemo(() => {
    const result: KakaoMapStore[] = [];
    const seen = new Set<string>();
    for (const store of visibleStores) {
      const { lat, lon } = store;
      const bizesId = trimmed(store.bizesId);
      if (typeof lat !== 'number' || !Number.isFinite(lat) || Math.abs(lat) > 90 ||
          typeof lon !== 'number' || !Number.isFinite(lon) || Math.abs(lon) > 180 ||
          !bizesId || seen.has(bizesId)) continue;
      result.push({
        ...store,
        bizesId,
        bizesNm: trimmed(store.bizesNm) || '상호명 미제공',
        lat,
        lon,
        salesStatus: salesTargetStatuses.get(bizesId),
      });
      seen.add(bizesId);
    }
    return result;
  }, [salesTargetStatuses, visibleStores]);

  const selectedPublicStoreId = trimmed(selectedPublicStore?.bizesId);
  const selectedPublicStoreStatus = selectedPublicStoreId
    ? salesTargetStatuses.get(selectedPublicStoreId)
    : undefined;

  function submitRegionSearch(): void {
    const query = regionQuery.trim();
    if (!query) {
      setRegionResults([]);
      setRegionSearchStatus('zero');
      return;
    }
    const id = ++regionRequestId.current;
    setRegionSearchRequest({ id, query });
    setRegionResults([]);
    setRegionSearchStatus('loading');
    Keyboard.dismiss();
  }

  function handleRegionSearchResult(
    requestId: number,
    results: KakaoPlaceSearchResult[],
    status: RegionSearchStatus,
  ): void {
    if (requestId !== regionRequestId.current) return;
    setRegionResults(results);
    setRegionSearchStatus(status === 'ok' ? 'results' : status);
  }

  function selectRegion(result: KakaoPlaceSearchResult): void {
    const center = { latitude: result.latitude, longitude: result.longitude };
    setMapCenter(center);
    setSelectedRegionName(result.name);
    setRegionQuery(result.name);
    setRegionResults([]);
    setRegionSearchStatus('idle');
    setNeedsAreaSearch(false);
    Keyboard.dismiss();
    void loadStores(center);
  }

  async function handleRegister(): Promise<void> {
    if (!selectedPublicStore || registeringStoreId) return;
    const requestBody = toCreateSalesTargetRequest(selectedPublicStore);
    if (!requestBody) {
      Alert.alert('등록할 수 없음', '이 매장은 필수 정보가 부족해 영업 대상으로 등록할 수 없습니다.');
      return;
    }
    if (salesTargetStatuses.has(requestBody.storeId)) return;

    setRegisteringStoreId(requestBody.storeId);
    try {
      const created = await createSalesTarget(requestBody);
      setSalesTargets(previous => previous.some(target => target.storeId === created.storeId)
        ? previous.map(target => target.storeId === created.storeId ? created : target)
        : [created, ...previous]);
      setSalesTargetError(null);
    } catch (error) {
      if (error instanceof SalesTargetApiError && error.status === 409) {
        const existing = await getSalesTarget(requestBody.storeId).catch(() => null);
        if (existing) {
          setSalesTargets(previous => previous.some(target => target.storeId === existing.storeId)
            ? previous.map(target => target.storeId === existing.storeId ? existing : target)
            : [existing, ...previous]);
          setSalesTargetError(null);
          return;
        }
      }
      Alert.alert(
        '영업 대상 등록 실패',
        error instanceof SalesTargetApiError ? error.message : '영업 대상을 등록하지 못했습니다.',
      );
    } finally {
      setRegisteringStoreId(null);
    }
  }

  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    <MainScreenLayout title="지도">
      <View style={ui.section}>
        <Text style={styles.sectionLabel}>지역 이동</Text>
        <View style={styles.regionSearch}>
          <Ionicons name="location-outline" size={20} color={colors.textSecondary} />
          <TextInput
            accessibilityLabel="이동할 지역 검색"
            value={regionQuery}
            onChangeText={value => {
              setRegionQuery(value);
              if (regionSearchRequest) {
                regionRequestId.current += 1;
                setRegionSearchRequest(null);
              }
              if (regionSearchStatus !== 'idle') {
                setRegionResults([]);
                setRegionSearchStatus('idle');
              }
            }}
            onSubmitEditing={submitRegionSearch}
            placeholder="강남역, 잠실, 홍대입구, 남양주 진접"
            placeholderTextColor={colors.textSecondary}
            selectionColor={colors.primary}
            autoCorrect={false}
            returnKeyType="search"
            style={styles.regionInput}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="지역 검색"
            disabled={regionSearchStatus === 'loading'}
            onPress={submitRegionSearch}
            style={({ pressed }) => [styles.regionButton, pressed && styles.pressed]}
          >
            {regionSearchStatus === 'loading'
              ? <ActivityIndicator size="small" color={colors.background} />
              : <Ionicons name="search" size={19} color={colors.background} />}
          </Pressable>
        </View>
        {regionSearchStatus === 'zero' ? <Text style={styles.feedback} accessibilityLiveRegion="polite">
          {regionQuery.trim() ? '검색 결과가 없습니다. 지역명을 더 구체적으로 입력해 주세요.' : '검색할 지역명을 입력해 주세요.'}
        </Text> : null}
        {regionSearchStatus === 'error' ? <Text style={[styles.feedback, styles.error]} accessibilityLiveRegion="polite">
          지역 검색에 실패했습니다. 네트워크 연결을 확인한 뒤 다시 시도해 주세요.
        </Text> : null}
        {regionResults.length ? <View style={styles.regionResults}>
          {regionResults.map((result, index) => <Pressable
            key={result.id || `${result.latitude},${result.longitude},${index}`}
            accessibilityRole="button"
            accessibilityLabel={`${result.name} 위치 선택`}
            onPress={() => selectRegion(result)}
            style={({ pressed }) => [styles.regionResult, pressed && styles.resultPressed]}
          >
            <View style={styles.resultIcon}><Ionicons name="location" size={17} color={colors.primary} /></View>
            <View style={ui.grow}>
              <Text style={styles.resultName} numberOfLines={1}>{result.name}</Text>
              <Text style={styles.resultAddress} numberOfLines={2}>
                {result.roadAddress || result.address || result.categoryName}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={colors.textSecondary} />
          </Pressable>)}
        </View> : null}
      </View>

      <View style={ui.section}>
        <Text style={styles.sectionLabel}>조회된 음식점 찾기</Text>
        <SearchField
          value={storeQuery}
          onChangeText={setStoreQuery}
          placeholder="음식점 이름, 주소 또는 업종 검색"
        />
        <FilterChips options={filters} value={filter} onChange={setFilter} />
      </View>

      <View style={styles.mapSection}>
        <KakaoMap
          latitude={mapCenter.latitude}
          longitude={mapCenter.longitude}
          stores={mapStores}
          regionSearchRequest={regionSearchRequest}
          onRegionSearchResult={handleRegionSearchResult}
          onCenterIdle={(center, userInitiated) => {
            setMapCenter(center);
            if (userInitiated) {
              setSelectedRegionName('현재 지도 중심');
              setNeedsAreaSearch(true);
              setSelectedPublicStore(null);
            }
          }}
          onStorePress={storeId => {
            const selected = stores.find(store => store.bizesId === storeId);
            if (selected) setSelectedPublicStore(selected);
          }}
        />
        {needsAreaSearch ? <Pressable
          accessibilityRole="button"
          accessibilityLabel="현재 지도 중심에서 음식점 다시 검색"
          onPress={() => { void loadStores(mapCenter); }}
          style={({ pressed }) => [styles.areaSearchButton, pressed && styles.areaSearchPressed]}
        >
          <Ionicons name="search" size={18} color={colors.background} />
          <Text style={styles.areaSearchText}>이 지역 음식점 검색</Text>
        </Pressable> : null}
      </View>

      <View style={styles.mapMeta}>
        <View style={styles.metaTitleRow}>
          <Text style={styles.metaTitle}>{selectedRegionName} · 반경 {SEARCH_RADIUS / 1000}km</Text>
          {loadingStores ? <ActivityIndicator size="small" color={colors.primary} /> : null}
        </View>
        <Text style={ui.muted} accessibilityLiveRegion="polite">
          {loadingStores
            ? '음식점을 불러오는 중...'
            : storeError ?? (stores.length
              ? `조회 ${stores.length}곳 · 현재 필터 마커 ${mapStores.length}곳`
              : '이 지역에는 조회된 음식점이 없습니다. 지도를 이동해 다시 검색해 보세요.')}
        </Text>
        <View style={styles.legend}>
          <View style={styles.legendItem}><View style={[styles.legendDot, styles.unregisteredDot]} /><Text style={styles.legendText}>미등록</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, styles.registeredDot]} /><Text style={styles.legendText}>등록됨 · 상태별 색상</Text></View>
        </View>
        {salesTargetError ? <Text style={[ui.muted, styles.error]} accessibilityLiveRegion="polite">
          {salesTargetError} 지도와 음식점 마커는 계속 사용할 수 있습니다.
        </Text> : null}
      </View>
    </MainScreenLayout>
    {selectedPublicStore ? <PublicStoreDetailsCard
      key={selectedPublicStore.bizesId}
      store={selectedPublicStore}
      status={selectedPublicStoreStatus}
      registering={registeringStoreId === selectedPublicStoreId}
      loadingRegistrationStatus={loadingSalesTargets}
      onClose={() => setSelectedPublicStore(null)}
      onRegister={() => { void handleRegister(); }}
    /> : null}
  </View>;
}

const styles = StyleSheet.create({
  sectionLabel: { color: colors.text, fontSize: 14, fontWeight: '700' },
  regionSearch: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingLeft: 14,
    paddingRight: 5,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  regionInput: { flex: 1, minWidth: 0, paddingVertical: 12, color: colors.text, fontSize: 14 },
  regionButton: {
    width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  pressed: { opacity: 0.72 },
  feedback: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
  error: { color: colors.error },
  regionResults: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    overflow: 'hidden', backgroundColor: colors.background,
  },
  regionResult: {
    minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  resultPressed: { backgroundColor: colors.surface },
  resultIcon: {
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFF0F0',
  },
  resultName: { color: colors.text, fontSize: 14, fontWeight: '700' },
  resultAddress: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 2 },
  mapSection: { minHeight: 330, position: 'relative' },
  areaSearchButton: {
    position: 'absolute', left: 34, right: 34, bottom: 16, minHeight: 48,
    borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.background,
    shadowColor: '#000000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  areaSearchPressed: { backgroundColor: colors.primaryDark, transform: [{ scale: 0.98 }] },
  areaSearchText: { color: colors.background, fontSize: 14, fontWeight: '700' },
  mapMeta: { gap: 8, marginTop: -16 },
  metaTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  metaTitle: { color: colors.text, fontSize: 14, fontWeight: '700', flex: 1 },
  legend: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  unregisteredDot: { backgroundColor: colors.primary },
  registeredDot: { backgroundColor: '#16A34A' },
  legendText: { color: colors.textSecondary, fontSize: 12 },
});
