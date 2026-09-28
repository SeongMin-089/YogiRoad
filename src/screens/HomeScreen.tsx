import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MainScreenLayout, { ui } from '../components/MainScreenLayout';
import SectionHeader from '../components/SectionHeader';
import StatCard from '../components/StatCard';
import StoreCard from '../components/StoreCard';
import StoreDetailsModal from '../components/StoreDetailsModal';
import { colors } from '../constants/colors';
import { activities, profile, stores, todayStats, visits } from '../data/mockData';
import type { MainScreenProps } from '../types/navigation';
import type { Store } from '../types/sales';

export default function HomeScreen({ navigation }: MainScreenProps<'Home'>) {
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  return <MainScreenLayout>
    <View style={ui.section}>
      <View style={ui.row}><View style={ui.grow}><Text accessibilityRole="header" style={styles.greeting}>안녕하세요,{ '\n' }{profile.name}님</Text><Text style={styles.subtitle}>오늘도 좋은 영업 되세요.</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="내 프로필 보기" onPress={() => navigation.navigate('MyPage')} style={styles.avatar}><Ionicons name="person-outline" size={22} color={colors.primaryDark} /></Pressable>
      </View>
      <View style={styles.region}><Ionicons name="location-outline" size={16} color={colors.textSecondary} /><Text style={[ui.muted, ui.grow]}>담당 지역 · {profile.region}</Text></View>
    </View>
    <View style={ui.section}><SectionHeader title="오늘의 영업 현황" /><View style={ui.grid}>{todayStats.map(stat => <StatCard key={stat.label} {...stat} />)}</View></View>
    <View style={ui.section}><SectionHeader title="오늘 방문 예정" actionText="전체보기" onAction={() => navigation.navigate('Sales')} />
      {visits.map(({ store, time }) => <StoreCard key={store.id} {...store} status="방문 예정" meta={time} onPress={() => setSelectedStore(store)} />)}
    </View>
    <View style={ui.section}><SectionHeader title="추천 영업 후보" /><Text style={ui.muted}>새로운 기회, 가까운 매장부터 만나보세요.</Text>
      {stores.filter(store => store.status === '미방문').map(store => <StoreCard key={store.id} {...store} status="미접촉" meta={store.distance} onPress={() => setSelectedStore(store)} />)}
    </View>
    <View style={ui.section}><SectionHeader title="최근 영업 활동" />
      {activities.map(activity => <View key={activity.id} style={styles.activity}><View style={styles.dot} /><View style={ui.grow}><Text style={ui.name}>{activity.name}</Text><Text style={ui.muted}>{activity.description}</Text><Text style={styles.time}>{activity.time}</Text></View></View>)}
    </View>
    <StoreDetailsModal store={selectedStore} onClose={() => setSelectedStore(null)} />
  </MainScreenLayout>;
}
const styles = StyleSheet.create({
  greeting: { fontSize: 24, lineHeight: 34, fontWeight: '700', color: colors.text },
  subtitle: { color: colors.textSecondary, fontSize: 14, lineHeight: 22, marginTop: 8 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center' },
  region: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginTop: 6 },
  activity: { flexDirection: 'row', gap: 12, paddingVertical: 10 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary, marginTop: 9 },
  time: { color: colors.textSecondary, fontSize: 12, marginTop: 6 },
});
