import { StyleSheet, Text, View } from 'react-native';
import MainScreenLayout, { ui } from '../components/MainScreenLayout';
import SectionHeader from '../components/SectionHeader';
import StatCard from '../components/StatCard';
import { statusColors } from '../components/StatusBadge';
import { colors } from '../constants/colors';
import { useSalesTargets } from '../hooks/useSalesTargets';
import { SALES_STATUSES, type SalesStatus } from '../types/sales';

function registeredDate(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export default function DashboardScreen() {
  const { salesTargets, loading, error } = useSalesTargets();
  const counts = Object.fromEntries(SALES_STATUSES.map(status => [
    status,
    salesTargets.filter(target => target.status === status).length,
  ])) as Record<SalesStatus, number>;
  const total = salesTargets.length;
  const stats = [
    { label: '등록 매장', value: String(total) },
    { label: '상담 진행', value: String(counts.상담중) },
    { label: '계약 완료', value: String(counts.계약완료) },
    { label: '재방문', value: String(counts.재방문) },
  ];
  const contracts = salesTargets
    .filter(target => target.status === '계약완료')
    .slice(0, 5);

  return <MainScreenLayout title="대시보드">
    {loading ? <View style={ui.empty}><Text style={ui.name}>영업 현황을 불러오는 중...</Text></View> : null}
    {!loading && error ? <View style={ui.empty}>
      <Text style={ui.name}>영업 현황을 불러오지 못했습니다.</Text>
      <Text style={ui.muted}>{error}</Text>
    </View> : null}
    {!loading && !error ? <>
      <View style={ui.section}><Text style={ui.muted}>현재 등록된 영업 대상 기준</Text></View>
      <View style={ui.grid}>{stats.map(stat => <StatCard key={stat.label} {...stat} />)}</View>
      <View style={ui.section}><SectionHeader title="영업 진행 현황" /><View style={[ui.card, styles.bars]}>
        {SALES_STATUSES.map(status => {
          const count = counts[status];
          const percentage = total > 0 ? count / total * 100 : 0;
          return <View key={status} style={styles.barGroup}>
            <View style={ui.row}><Text style={[ui.body, ui.grow]}>{status}</Text><Text style={ui.name}>{count}<Text style={ui.muted}>곳</Text></Text></View>
            <View accessibilityRole="progressbar" accessibilityLabel={status}
              accessibilityValue={{ min: 0, max: Math.max(total, 1), now: count }} style={styles.track}>
              <View style={[styles.fill, { width: `${percentage}%`, backgroundColor: statusColors[status].foreground }]} />
            </View>
          </View>;
        })}
      </View></View>
      <View style={ui.section}><SectionHeader title="최근 계약" />
        {contracts.map(contract => {
          const date = registeredDate(contract.registeredAt);
          return <View key={contract.storeId} style={[ui.card, styles.contract]}>
            <Text style={ui.name}>{contract.storeName}</Text>
            <Text style={ui.muted}>계약 완료{date ? ` · 영업 대상 등록일 ${date}` : ''}</Text>
          </View>;
        })}
        {!contracts.length ? <View style={ui.empty}>
          <Text style={ui.name}>계약 완료된 영업 대상이 없습니다.</Text>
        </View> : null}
      </View>
    </> : null}
  </MainScreenLayout>;
}

const styles = StyleSheet.create({
  bars: { gap: 22 }, barGroup: { gap: 10 },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.surface, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 }, contract: { gap: 6 },
});
