import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MainScreenLayout, { ui } from '../components/MainScreenLayout';
import SectionHeader from '../components/SectionHeader';
import StatCard from '../components/StatCard';
import StoreCard from '../components/StoreCard';
import StoreDetailsModal from '../components/StoreDetailsModal';
import { colors } from '../constants/colors';
import { useSalesTargets } from '../hooks/useSalesTargets';
import type { SalesTarget } from '../services/salesTargetApi';
import type { MainScreenProps } from '../types/navigation';
import type { SalesStatus } from '../types/sales';

export default function HomeScreen({ navigation }: MainScreenProps<'Home'>) {
  const [selectedTarget, setSelectedTarget] = useState<SalesTarget | null>(null);
  const {
    salesTargets,
    loading,
    error,
    reload,
    updateLocalSalesTarget,
    removeLocalSalesTarget,
  } = useSalesTargets();
  const count = (status: SalesStatus) => salesTargets.filter(target => target.status === status).length;
  const stats = [
    { label: '등록 매장', value: String(salesTargets.length) },
    { label: '상담중', value: String(count('상담중')) },
    { label: '재방문', value: String(count('재방문')) },
    { label: '계약 완료', value: String(count('계약완료')) },
  ];
  const unvisitedTargets = salesTargets.filter(target => target.status === '미방문');

  return <MainScreenLayout>
    <View style={ui.section}>
      <View style={ui.row}><View style={ui.grow}>
        <Text accessibilityRole="header" style={styles.greeting}>안녕하세요.</Text>
        <Text style={styles.subtitle}>오늘도 좋은 영업 되세요.</Text>
      </View>
        <Pressable accessibilityRole="button" accessibilityLabel="마이 화면 열기" onPress={() => navigation.navigate('MyPage')} style={styles.avatar}>
          <Ionicons name="person-outline" size={22} color={colors.primaryDark} />
        </Pressable>
      </View>
    </View>
    <View style={ui.section}><SectionHeader title="영업 대상 현황" />
      {loading ? <View style={ui.empty}><Text style={ui.name}>영업 현황을 불러오는 중...</Text></View> : null}
      {!loading && error ? <View style={ui.empty}>
        <Text style={ui.name}>영업 현황을 불러오지 못했습니다.</Text>
        <Text style={ui.muted}>{error}</Text>
      </View> : null}
      {!loading && !error ? <View style={ui.grid}>{stats.map(stat => <StatCard key={stat.label} {...stat} />)}</View> : null}
    </View>
    <View style={ui.section}><SectionHeader title="오늘 방문 예정" />
      <View style={ui.empty}>
        <Text style={ui.name}>등록된 방문 일정이 없습니다.</Text>
        <Text style={ui.muted}>방문 일정 기능 준비중</Text>
      </View>
    </View>
    <View style={ui.section}><SectionHeader title="미방문 영업 대상" actionText="전체보기" onAction={() => navigation.navigate('Sales')} />
      {!loading && !error ? unvisitedTargets.map(target => <StoreCard
        key={target.storeId}
        name={target.storeName}
        category={target.category}
        address={target.address}
        status={target.status}
        meta={target.memo.trim() || undefined}
        onPress={() => setSelectedTarget(target)}
      />) : null}
      {!loading && !error && !unvisitedTargets.length ? <View style={ui.empty}>
        <Text style={ui.name}>미방문 영업 대상이 없습니다.</Text>
        <Text style={ui.muted}>지도에서 새로운 영업 대상을 등록해 주세요.</Text>
      </View> : null}
    </View>
    <View style={ui.section}><SectionHeader title="최근 영업 활동" />
      <View style={ui.empty}>
        <Text style={ui.name}>영업 활동 기록 기능 준비중</Text>
        <Text style={ui.muted}>방문 및 상담 기록이 구현되면 여기에 표시됩니다.</Text>
      </View>
    </View>
    <StoreDetailsModal
      target={selectedTarget}
      onClose={() => setSelectedTarget(null)}
      onChanged={updated => {
        setSelectedTarget(updated);
        updateLocalSalesTarget(updated);
        void reload();
      }}
      onDeleted={storeId => {
        setSelectedTarget(null);
        removeLocalSalesTarget(storeId);
        void reload();
      }}
    />
  </MainScreenLayout>;
}

const styles = StyleSheet.create({
  greeting: { fontSize: 24, lineHeight: 34, fontWeight: '700', color: colors.text },
  subtitle: { color: colors.textSecondary, fontSize: 14, lineHeight: 22, marginTop: 8 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center' },
});
