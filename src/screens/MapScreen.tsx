import { useState } from 'react';
import { Text, View } from 'react-native';
import MainScreenLayout, { ui } from '../components/MainScreenLayout';
import SearchField from '../components/SearchField';
import FilterChips from '../components/FilterChips';
import KakaoMap from '../components/KakaoMap';
import StoreCard from '../components/StoreCard';
import StoreDetailsModal from '../components/StoreDetailsModal';
import { stores } from '../data/mockData';
import type { SalesStatus, Store } from '../types/sales';

const filters: ('전체' | SalesStatus)[] = ['전체', '미방문', '상담중', '재방문', '계약완료'];
export default function MapScreen() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'전체' | SalesStatus>('전체');
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const matches = stores.filter(store => (filter === '전체' || store.status === filter) && `${store.name} ${store.address}`.includes(query.trim()));
  const preview = matches[0];
  return <MainScreenLayout title="지도">
    <View style={ui.section}><SearchField value={query} onChangeText={setQuery} placeholder="매장명 또는 지역을 검색해 보세요" /><FilterChips options={filters} value={filter} onChange={setFilter} /></View>
    <KakaoMap />
    <View style={ui.section}><Text style={ui.muted}>예시 매장 · 검색 결과 {matches.length}곳</Text>
      {preview ? <StoreCard {...preview} address={preview.distance} meta="선택한 매장" onPress={() => setSelectedStore(preview)} /> : <View style={ui.empty}><Text style={ui.name}>검색 결과가 없어요</Text><Text style={ui.muted}>다른 매장명이나 지역, 상태를 선택해 주세요.</Text></View>}
    </View>
    <StoreDetailsModal store={selectedStore} onClose={() => setSelectedStore(null)} />
  </MainScreenLayout>;
}
