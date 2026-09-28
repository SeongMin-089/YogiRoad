import { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import MainScreenLayout, { ui } from '../components/MainScreenLayout';
import SearchField from '../components/SearchField';
import FilterChips from '../components/FilterChips';
import KakaoMap, { type KakaoMapStore } from '../components/KakaoMap';
import PublicStoreDetailsCard from '../components/PublicStoreDetailsCard';
import { colors } from '../constants/colors';
import { fetchRestaurantsInRadius, PublicDataApiError, type PublicDataStore } from '../services/publicDataApi';
import StoreCard from '../components/StoreCard';
import StoreDetailsModal from '../components/StoreDetailsModal';
import { stores as mockStores } from '../data/mockData';
import type { SalesStatus, Store } from '../types/sales';

const filters: ('전체' | SalesStatus)[] = ['전체', '미방문', '상담중', '재방문', '계약완료'];
export default function MapScreen() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'전체' | SalesStatus>('전체');
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [stores, setStores] = useState<PublicDataStore[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [selectedPublicStore, setSelectedPublicStore] = useState<PublicDataStore | null>(null);
  const [registeredStoreIds, setRegisteredStoreIds] = useState<Set<string>>(() => new Set());
  const request = useRef<Promise<PublicDataStore[]> | null>(null);

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

  const mapStores = useMemo(() => {
    const result: KakaoMapStore[] = [];
    const seen = new Set<string>();
    for (const store of stores) {
      const { lat, lon, bizesId } = store;
      if (typeof lat !== 'number' || !Number.isFinite(lat) || Math.abs(lat) > 90 ||
          typeof lon !== 'number' || !Number.isFinite(lon) || Math.abs(lon) > 180 ||
          !bizesId || seen.has(bizesId)) continue;
      result.push({ ...store, bizesId, bizesNm: store.bizesNm || '상호명 미제공', lat, lon });
      seen.add(bizesId);
      if (result.length === 20) break;
    }
    return result;
  }, [stores]);

  const matches = mockStores.filter(store => (filter === '전체' || store.status === filter) && `${store.name} ${store.address}`.includes(query.trim()));
  const preview = matches[0];
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
    <View style={ui.section}><Text style={ui.muted}>예시 매장 · 검색 결과 {matches.length}곳</Text>
      {preview ? <StoreCard {...preview} address={preview.distance} meta="선택한 매장" onPress={() => setSelectedStore(preview)} /> : <View style={ui.empty}><Text style={ui.name}>검색 결과가 없어요</Text><Text style={ui.muted}>다른 매장명이나 지역, 상태를 선택해 주세요.</Text></View>}
    </View>
    <StoreDetailsModal store={selectedStore} onClose={() => setSelectedStore(null)} />
    </MainScreenLayout>
    {selectedPublicStore ? <PublicStoreDetailsCard
      key={selectedPublicStore.bizesId}
      store={selectedPublicStore}
      registered={!!selectedPublicStore.bizesId && registeredStoreIds.has(selectedPublicStore.bizesId)}
      onClose={() => setSelectedPublicStore(null)}
      onRegister={() => {
        const id = selectedPublicStore.bizesId;
        if (!id?.trim()) return;
        setRegisteredStoreIds(previous => previous.has(id) ? previous : new Set(previous).add(id));
      }}
    /> : null}
  </View>;
}
