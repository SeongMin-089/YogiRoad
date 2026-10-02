import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import MainScreenLayout, { ui } from '../components/MainScreenLayout';
import SearchField from '../components/SearchField';
import FilterChips from '../components/FilterChips';
import KakaoMap, { type KakaoMapStore } from '../components/KakaoMap';
import PublicStoreDetailsCard from '../components/PublicStoreDetailsCard';
import { colors } from '../constants/colors';
import { fetchRestaurantsInRadius, PublicDataApiError, type PublicDataStore } from '../services/publicDataApi';
import type { SalesStatus } from '../types/sales';
import {
  createSalesTarget,
  getSalesTarget,
  getSalesTargets,
  SalesTargetApiError,
  type CreateSalesTargetRequest,
  type SalesTarget,
} from '../services/salesTargetApi';

const filters: ('전체' | SalesStatus)[] = ['전체', '미방문', '상담중', '재방문', '계약완료', '거절'];

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

export default function MapScreen() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'전체' | SalesStatus>('전체');
  const [stores, setStores] = useState<PublicDataStore[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [selectedPublicStore, setSelectedPublicStore] = useState<PublicDataStore | null>(null);
  const [salesTargets, setSalesTargets] = useState<SalesTarget[]>([]);
  const [loadingSalesTargets, setLoadingSalesTargets] = useState(true);
  const [salesTargetError, setSalesTargetError] = useState<string | null>(null);
  const [registeringStoreId, setRegisteringStoreId] = useState<string | null>(null);
  const request = useRef<Promise<PublicDataStore[]> | null>(null);
  const salesTargetRequest = useRef<Promise<SalesTarget[]> | null>(null);

  useEffect(() => {
    let active = true;
    // Reuse the promise if development StrictMode re-runs this effect.
    request.current ??= fetchRestaurantsInRadius();
    void request.current.then(result => {
      if (active) setStores(result);
    }).catch((error: unknown) => {
      if (!active) return;
      setStoreError(error instanceof PublicDataApiError && error.kind === 'NO_ITEMS'
        ? '주변 음식점 데이터가 없습니다.' : '주변 음식점을 불러오지 못했습니다. 지도는 계속 사용할 수 있습니다.');
    }).finally(() => {
      if (active) setLoadingStores(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    // Reuse the promise if development StrictMode re-runs this effect.
    salesTargetRequest.current ??= getSalesTargets();
    void salesTargetRequest.current.then(result => {
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
  }, []);

  const salesTargetStatuses = useMemo(
    () => new Map(salesTargets.map(target => [target.storeId, target.status])),
    [salesTargets],
  );

  const visibleStores = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR');
    return stores.filter(store => {
      const storeId = trimmed(store.bizesId);
      const matchesStatus = filter === '전체' || salesTargetStatuses.get(storeId) === filter;
      const matchesQuery = !normalizedQuery || [
        store.bizesNm,
        store.rdnmAdr,
        store.lnoAdr,
        store.indsMclsNm,
        store.indsSclsNm,
      ].some(value => trimmed(value).toLocaleLowerCase('ko-KR').includes(normalizedQuery));
      return matchesStatus && matchesQuery;
    });
  }, [filter, query, salesTargetStatuses, stores]);

  const mapStores = useMemo(() => {
    const result: KakaoMapStore[] = [];
    const seen = new Set<string>();
    for (const store of visibleStores) {
      const { lat, lon, bizesId } = store;
      if (typeof lat !== 'number' || !Number.isFinite(lat) || Math.abs(lat) > 90 ||
          typeof lon !== 'number' || !Number.isFinite(lon) || Math.abs(lon) > 180 ||
          !bizesId || seen.has(bizesId)) continue;
      result.push({ ...store, bizesId, bizesNm: store.bizesNm || '상호명 미제공', lat, lon });
      seen.add(bizesId);
      if (result.length === 20) break;
    }
    return result;
  }, [visibleStores]);

  const salesTargetIds = useMemo(
    () => new Set(salesTargets.map(target => target.storeId)),
    [salesTargets],
  );

  const selectedPublicStoreId = trimmed(selectedPublicStore?.bizesId);
  const selectedPublicStoreRegistered = !!selectedPublicStoreId && salesTargetIds.has(selectedPublicStoreId);

  async function handleRegister(): Promise<void> {
    if (!selectedPublicStore || registeringStoreId) return;
    const requestBody = toCreateSalesTargetRequest(selectedPublicStore);
    if (!requestBody) {
      Alert.alert('등록할 수 없음', '이 매장은 필수 정보가 부족해 영업 대상으로 등록할 수 없습니다.');
      return;
    }
    if (salesTargetIds.has(requestBody.storeId)) return;

    setRegisteringStoreId(requestBody.storeId);
    try {
      const created = await createSalesTarget(requestBody);
      setSalesTargets(previous => previous.some(target => target.storeId === created.storeId)
        ? previous
        : [created, ...previous]);
      setSalesTargetError(null);
    } catch (error) {
      if (error instanceof SalesTargetApiError && error.status === 409) {
        const existing = await getSalesTarget(requestBody.storeId).catch(() => null);
        if (existing) {
          setSalesTargets(previous => previous.some(target => target.storeId === existing.storeId)
            ? previous
            : [existing, ...previous]);
          setSalesTargetError(null);
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
    <View style={ui.section}><SearchField value={query} onChangeText={setQuery} placeholder="매장명 또는 지역을 검색해 보세요" /><FilterChips options={filters} value={filter} onChange={setFilter} /></View>
    <KakaoMap stores={mapStores} onStorePress={storeId => {
      const selected = stores.find(store => store.bizesId === storeId);
      if (selected) setSelectedPublicStore(selected);
    }} />
    <Text style={ui.muted} accessibilityLiveRegion="polite">{loadingStores
      ? '주변 음식점을 불러오는 중...'
      : storeError ?? (mapStores.length ? `주변 음식점 ${mapStores.length}곳 · 마커를 눌러 정보를 확인하세요.` : '표시할 수 있는 음식점 좌표가 없습니다.')}</Text>
    {salesTargetError ? <Text style={ui.muted} accessibilityLiveRegion="polite">
      {salesTargetError} 지도와 음식점 마커는 계속 사용할 수 있습니다.
    </Text> : null}
    </MainScreenLayout>
    {selectedPublicStore ? <PublicStoreDetailsCard
      key={selectedPublicStore.bizesId}
      store={selectedPublicStore}
      registered={selectedPublicStoreRegistered}
      registering={registeringStoreId === selectedPublicStoreId}
      loadingRegistrationStatus={loadingSalesTargets}
      onClose={() => setSelectedPublicStore(null)}
      onRegister={() => { void handleRegister(); }}
    /> : null}
  </View>;
}
