import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MainScreenLayout, { ui } from '../components/MainScreenLayout';
import FilterChips from '../components/FilterChips';
import SectionHeader from '../components/SectionHeader';
import StatCard from '../components/StatCard';
import { statusColors } from '../components/StatusBadge';
import { colors } from '../constants/colors';
import { dashboardData } from '../data/mockData';

const periods = ['이번 주', '이번 달'] as const;
export default function DashboardScreen() {
  const [period, setPeriod] = useState<typeof periods[number]>('이번 달');
  const data = dashboardData[period];
  const total = data.progress.reduce((sum, item) => sum + item.count, 0);
  return <MainScreenLayout title="대시보드">
    <View style={ui.section}><FilterChips options={periods} value={period} onChange={setPeriod} /><Text style={ui.muted}>예시 실적 · {period} 기준</Text></View>
    <View style={ui.grid}>{data.stats.map(stat => <StatCard key={stat.label} {...stat} />)}</View>
    <View style={ui.section}><SectionHeader title="영업 진행 현황" /><View style={[ui.card, styles.bars]}>
      {data.progress.map(item => <View key={item.status} style={styles.barGroup}>
        <View style={ui.row}><Text style={[ui.body, ui.grow]}>{item.status}</Text><Text style={ui.name}>{item.count}<Text style={ui.muted}>곳</Text></Text></View>
        <View accessibilityRole="progressbar" accessibilityLabel={item.status} accessibilityValue={{ min: 0, max: total, now: item.count }} style={styles.track}><View style={[styles.fill, { width: `${item.count / total * 100}%`, backgroundColor: statusColors[item.status].foreground }]} /></View>
      </View>)}
    </View></View>
    <View style={ui.section}><SectionHeader title="최근 계약" />{data.contracts.map(contract => <View key={contract.name} style={[ui.card, styles.contract]}><Text style={ui.name}>{contract.name}</Text><Text style={ui.muted}>계약 완료 · {contract.date}</Text></View>)}</View>
  </MainScreenLayout>;
}
const styles = StyleSheet.create({
  bars: { gap: 22 }, barGroup: { gap: 10 },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.surface, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 }, contract: { gap: 6 },
});
