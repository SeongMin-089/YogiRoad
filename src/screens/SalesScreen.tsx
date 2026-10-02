import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import MainScreenLayout, { ui } from '../components/MainScreenLayout';
import SearchField from '../components/SearchField';
import FilterChips from '../components/FilterChips';
import StoreCard from '../components/StoreCard';
import StoreDetailsModal from '../components/StoreDetailsModal';
import { useSalesTargets } from '../hooks/useSalesTargets';
import type { SalesStatus, Store } from '../types/sales';

type Filter = '전체' | SalesStatus;
const statuses: readonly SalesStatus[] = ['미방문', '상담중', '재방문', '계약완료', '거절'];
const filters: readonly Filter[] = ['전체', ...statuses];

export default function SalesScreen() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('전체');
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const { salesTargets, loading, error } = useSalesTargets();

  const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR');
  const filtered = useMemo(() => salesTargets.filter(target => {
    const matchesQuery = !normalizedQuery || [target.storeName, target.address, target.category]
      .some(value => value.toLocaleLowerCase('ko-KR').includes(normalizedQuery));
    return matchesQuery && (filter === '전체' || target.status === filter);
  }), [filter, normalizedQuery, salesTargets]);

  const counts = useMemo(() => Object.fromEntries(filters.map(status => [
    status,
    status === '전체'
      ? salesTargets.length
      : salesTargets.filter(target => target.status === status).length,
  ])) as Record<Filter, number>, [salesTargets]);

  const stores = filtered.map<Store>(target => ({
    id: target.storeId,
    name: target.storeName,
    category: target.category,
    address: target.address,
    status: target.status,
    meta: target.memo.trim() || undefined,
  }));

  return <MainScreenLayout title="영업관리">
    <View style={ui.section}>
      <SearchField value={query} onChangeText={setQuery} placeholder="매장명, 주소 또는 업종을 검색해 주세요" />
      <FilterChips options={filters} value={filter} onChange={setFilter} counts={counts} />
    </View>
    <View style={ui.section}>
      {loading ? <View style={ui.empty}><Text style={ui.name}>영업 대상 정보를 불러오는 중...</Text></View> : null}
      {!loading && error ? <View style={ui.empty}>
        <Text style={ui.name}>영업 대상 정보를 불러오지 못했습니다.</Text>
        <Text style={ui.muted}>{error}</Text>
      </View> : null}
      {!loading && !error ? <>
        <Text style={ui.muted}>영업 대상 {filtered.length}곳</Text>
        {stores.map(store => <StoreCard key={store.id} {...store} onPress={() => setSelectedStore(store)} />)}
        {!salesTargets.length ? <View style={ui.empty}>
          <Text style={ui.name}>등록된 영업 대상이 없습니다.</Text>
          <Text style={ui.muted}>지도에서 음식점을 영업 대상으로 등록해 주세요.</Text>
        </View> : null}
        {salesTargets.length > 0 && !stores.length ? <View style={ui.empty}>
          <Text style={ui.name}>검색 결과가 없습니다.</Text>
          <Text style={ui.muted}>검색어나 상태 필터를 변경해 주세요.</Text>
        </View> : null}
      </> : null}
    </View>
    <StoreDetailsModal store={selectedStore} onClose={() => setSelectedStore(null)} />
  </MainScreenLayout>;
}
