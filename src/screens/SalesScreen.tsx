import { useState } from 'react';
import { Text, View } from 'react-native';
import MainScreenLayout, { ui } from '../components/MainScreenLayout';
import SearchField from '../components/SearchField';
import FilterChips from '../components/FilterChips';
import StoreCard from '../components/StoreCard';
import StoreDetailsModal from '../components/StoreDetailsModal';
import { statuses, stores } from '../data/mockData';
import type { SalesStatus, Store } from '../types/sales';

type Filter = '전체' | SalesStatus;
const filters: Filter[] = ['전체', ...statuses];
export default function SalesScreen() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('전체');
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const searched = stores.filter(store => store.name.includes(query.trim()));
  const filtered = searched.filter(store => filter === '전체' || store.status === filter);
  const counts = Object.fromEntries(filters.map(status => [status, searched.filter(store => status === '전체' || store.status === status).length]));
  return <MainScreenLayout title="영업관리">
    <View style={ui.section}><SearchField value={query} onChangeText={setQuery} placeholder="매장명을 검색해 주세요" /><FilterChips options={filters} value={filter} onChange={setFilter} counts={counts} /></View>
    <View style={ui.section}><Text style={ui.muted}>매장 {filtered.length}곳 · 예시 데이터</Text>
      {filtered.map(store => <StoreCard key={store.id} {...store} onPress={() => setSelectedStore(store)} />)}
      {!filtered.length ? <View style={ui.empty}><Text style={ui.name}>검색 결과가 없어요</Text><Text style={ui.muted}>검색어나 상태 필터를 변경해 주세요.</Text></View> : null}
    </View>
    <StoreDetailsModal store={selectedStore} onClose={() => setSelectedStore(null)} />
  </MainScreenLayout>;
}
