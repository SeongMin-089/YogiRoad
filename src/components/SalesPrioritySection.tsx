import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import { useSalesPriorities } from '../hooks/useSalesPriorities';
import { ui } from './MainScreenLayout';
import SectionHeader from './SectionHeader';
import StatusBadge from './StatusBadge';

type Props = {
  onSelectStore: (storeId: string) => void;
};

export default function SalesPrioritySection({ onSelectStore }: Props) {
  const { priorities, loading, error } = useSalesPriorities();

  return <View style={ui.section}>
    <SectionHeader title="오늘 우선 확인 매장" />
    {loading ? <View style={ui.empty}>
      <Text style={ui.name}>우선 확인 매장을 계산하는 중...</Text>
    </View> : null}
    {!loading && error ? <View style={ui.empty}>
      <Text style={ui.name}>우선 확인 매장을 불러오지 못했습니다.</Text>
      <Text style={ui.muted}>{error}</Text>
    </View> : null}
    {!loading && !error ? priorities.map((priority, index) =>
      <Pressable
        key={priority.storeId}
        accessibilityRole="button"
        accessibilityLabel={priority.storeName + ' 영업 대상 상세 보기'}
        onPress={() => onSelectStore(priority.storeId)}
        style={({ pressed }) => [ui.card, styles.card, pressed && styles.pressed]}
      >
        <View style={ui.row}>
          <View style={styles.rank}><Text style={styles.rankText}>{index + 1}</Text></View>
          <View style={[ui.grow, styles.heading]}>
            <Text style={ui.name}>{priority.storeName}</Text>
            <Text style={ui.muted}>{[priority.category, priority.address].filter(Boolean).join(' · ')}</Text>
          </View>
          <StatusBadge status={priority.status} />
        </View>
        <Text style={styles.reason}>{priority.reason}</Text>
      </Pressable>) : null}
    {!loading && !error && !priorities.length ? <View style={ui.empty}>
      <Text style={ui.name}>현재 우선 확인이 필요한 매장이 없습니다.</Text>
      <Text style={ui.muted}>새 영업 대상을 등록하거나 다음 액션 일정을 추가해 보세요.</Text>
    </View> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  rank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0F0',
  },
  rankText: { color: colors.primaryDark, fontSize: 14, fontWeight: '800' },
  heading: { gap: 3 },
  reason: { color: colors.text, fontSize: 14, lineHeight: 22, fontWeight: '600' },
  pressed: { opacity: 0.65 },
});
