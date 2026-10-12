import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import FilterChips from '../components/FilterChips';
import MainScreenLayout, { ui } from '../components/MainScreenLayout';
import SectionHeader from '../components/SectionHeader';
import StatCard from '../components/StatCard';
import { statusColors } from '../components/StatusBadge';
import StoreCard from '../components/StoreCard';
import { colors } from '../constants/colors';
import {
  getSalesDashboard,
  SalesInsightsApiError,
  type DashboardPeriod,
  type SalesDashboard,
} from '../services/salesInsightsApi';
import { SALES_STATUSES, type SalesStatus } from '../types/sales';

const periodOptions = ['이번 주', '이번 달', '전체'] as const;
type PeriodLabel = (typeof periodOptions)[number];
const periodKeys: Record<PeriodLabel, DashboardPeriod> = {
  '이번 주': 'WEEK',
  '이번 달': 'MONTH',
  전체: 'ALL',
};

function formatPercentage(value: number): string {
  if (!Number.isFinite(value)) return '0%';
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
}

function registeredDate(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function dashboardErrorMessage(error: unknown): string {
  return error instanceof SalesInsightsApiError
    ? error.message
    : '대시보드 통계를 불러오지 못했습니다.';
}

export default function DashboardScreen() {
  const [period, setPeriod] = useState<PeriodLabel>('이번 주');
  const [dashboard, setDashboard] = useState<SalesDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  const loadDashboard = useCallback(async (): Promise<void> => {
    const version = ++requestVersion.current;
    setLoading(true);
    setError(null);
    try {
      const result = await getSalesDashboard();
      if (version === requestVersion.current) setDashboard(result);
    } catch (requestError) {
      if (version === requestVersion.current) setError(dashboardErrorMessage(requestError));
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadDashboard();
    return () => { requestVersion.current += 1; };
  }, [loadDashboard]));

  const selectedPerformance = dashboard?.periods[periodKeys[period]];
  const statusByName = useMemo(() => new Map(
    dashboard?.statusProgress.map(item => [item.status, item]) ?? [],
  ), [dashboard?.statusProgress]);
  const weeklyMax = Math.max(
    1,
    ...(dashboard?.weeklyConsultations.map(item => item.consultations) ?? [0]),
  );

  if (loading && !dashboard) {
    return <MainScreenLayout title="대시보드">
      <View style={[ui.empty, styles.centered]} accessibilityLiveRegion="polite">
        <ActivityIndicator color={colors.primary} />
        <Text style={ui.name}>영업 통계를 계산하는 중...</Text>
        <Text style={ui.muted}>등록 매장과 상담 활동을 불러오고 있습니다.</Text>
      </View>
    </MainScreenLayout>;
  }

  if (!dashboard) {
    return <MainScreenLayout title="대시보드">
      <View style={ui.empty} accessibilityLiveRegion="polite">
        <Text style={ui.name}>대시보드 통계를 불러오지 못했습니다.</Text>
        <Text style={ui.muted}>{error}</Text>
        <Pressable accessibilityRole="button" onPress={() => { void loadDashboard(); }}
          style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
          <Text style={styles.retryText}>다시 시도</Text>
        </Pressable>
      </View>
    </MainScreenLayout>;
  }

  const stats = [
    {
      label: '전체 등록 매장',
      value: String(dashboard.summary.totalRegisteredStores),
      helperText: `${period} 등록 ${selectedPerformance?.registeredStores ?? 0}곳`,
    },
    {
      label: '계약 완료 매장',
      value: String(dashboard.summary.completedContracts),
      helperText: '현재 상태 기준',
    },
    {
      label: '계약 전환율',
      value: formatPercentage(dashboard.summary.conversionRate),
      helperText: '전체 등록 대비',
    },
    {
      label: '이번 주 상담',
      value: String(dashboard.summary.thisWeekConsultations),
      helperText: period === '이번 주'
        ? '월요일~일요일'
        : `${period} 상담 ${selectedPerformance?.consultations ?? 0}건`,
    },
  ];

  return <MainScreenLayout title="대시보드">
    <View style={ui.section}>
      <Text style={styles.filterLabel}>기간별 실적</Text>
      <FilterChips options={periodOptions} value={period} onChange={setPeriod} />
      <Text style={ui.muted} accessibilityLiveRegion="polite">
        {period} 등록 {selectedPerformance?.registeredStores ?? 0}곳 · 상담 {selectedPerformance?.consultations ?? 0}건
      </Text>
    </View>

    {loading ? <View style={styles.refreshing} accessibilityLiveRegion="polite">
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={ui.muted}>최신 통계로 갱신 중...</Text>
    </View> : null}
    {error ? <View style={styles.warning} accessibilityLiveRegion="polite">
      <Text style={styles.warningText}>{error} 이전 통계를 표시합니다.</Text>
    </View> : null}

    <View style={ui.grid}>{stats.map(stat => <StatCard key={stat.label} {...stat} />)}</View>

    {!dashboard.summary.totalRegisteredStores ? <View style={ui.empty}>
      <Text style={ui.name}>아직 집계할 영업 대상이 없습니다.</Text>
      <Text style={ui.muted}>지도에서 영업 대상을 등록하고 상담 활동을 추가하면 통계가 표시됩니다.</Text>
    </View> : null}

    <View style={ui.section}>
      <SectionHeader title="이번 주 상담 활동" />
      <View style={[ui.card, styles.chartCard]}>
        <View style={styles.chart}>
          {dashboard.weeklyConsultations.map(item => {
            const barHeight = item.consultations > 0
              ? Math.max(12, item.consultations / weeklyMax * 112)
              : 4;
            return <View key={item.date} style={styles.chartColumn}>
              <Text style={styles.chartValue}>{item.consultations}</Text>
              <View
                accessibilityRole="progressbar"
                accessibilityLabel={`${item.dayLabel}요일 상담 ${item.consultations}건`}
                accessibilityValue={{ min: 0, max: weeklyMax, now: item.consultations }}
                style={styles.chartTrack}
              >
                <View style={[
                  styles.chartBar,
                  { height: barHeight },
                  item.consultations === 0 && styles.chartBarEmpty,
                ]} />
              </View>
              <Text style={styles.chartLabel}>{item.dayLabel}</Text>
            </View>;
          })}
        </View>
        <View style={styles.chartFooter}>
          <Text style={ui.muted}>월요일 00:00~일요일 23:59 · 한국 시간</Text>
          <Text style={styles.chartTotal}>합계 {dashboard.summary.thisWeekConsultations}건</Text>
        </View>
      </View>
    </View>

    <View style={ui.section}>
      <SectionHeader title="영업 진행 현황" />
      <View style={[ui.card, styles.bars]}>
        {SALES_STATUSES.map(status => {
          const item = statusByName.get(status) ?? { status, count: 0, percentage: 0 };
          const percentage = Math.max(0, Math.min(100, item.percentage));
          return <View key={status} style={styles.barGroup}>
            <View style={ui.row}>
              <Text style={[ui.body, ui.grow]}>{status}</Text>
              <Text style={styles.statusValue}>{item.count}곳 · {formatPercentage(percentage)}</Text>
            </View>
            <View
              accessibilityRole="progressbar"
              accessibilityLabel={`${status} ${item.count}곳, ${formatPercentage(percentage)}`}
              accessibilityValue={{ min: 0, max: 100, now: percentage }}
              style={styles.track}
            >
              <View style={[
                styles.fill,
                { width: `${percentage}%`, backgroundColor: statusColors[status as SalesStatus].foreground },
              ]} />
            </View>
          </View>;
        })}
      </View>
    </View>

    <View style={ui.section}>
      <SectionHeader title="최근 등록된 계약 완료 매장" />
      <Text style={ui.muted}>계약일이 저장되지 않아 영업 대상 등록일 최신순으로 표시합니다.</Text>
      {dashboard.recentCompletedStores.map(store => {
        const date = registeredDate(store.registeredAt);
        return <StoreCard
          key={store.storeId}
          name={store.storeName}
          category={store.category}
          address={store.address}
          status="계약완료"
          meta={date ? `영업 대상 등록일 ${date}` : '등록일 정보 없음'}
        />;
      })}
      {!dashboard.recentCompletedStores.length ? <View style={ui.empty}>
        <Text style={ui.name}>계약 완료된 영업 대상이 없습니다.</Text>
        <Text style={ui.muted}>영업관리에서 상태를 계약완료로 변경하면 여기에 표시됩니다.</Text>
      </View> : null}
    </View>
  </MainScreenLayout>;
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center' },
  filterLabel: { color: colors.text, fontSize: 14, fontWeight: '700' },
  refreshing: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: -12 },
  warning: { padding: 12, borderRadius: 10, backgroundColor: '#FFF4F4', borderWidth: 1, borderColor: '#FFD5D7' },
  warningText: { color: colors.error, fontSize: 13, lineHeight: 20 },
  retryButton: {
    alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingHorizontal: 16,
    borderRadius: 10, backgroundColor: colors.primary,
  },
  retryText: { color: colors.background, fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.7 },
  chartCard: { gap: 18, paddingTop: 20 },
  chart: { height: 166, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  chartColumn: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 7 },
  chartValue: { color: colors.textSecondary, fontSize: 11, fontVariant: ['tabular-nums'] },
  chartTrack: { flex: 1, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  chartBar: { width: '62%', maxWidth: 28, minWidth: 10, borderRadius: 7, backgroundColor: colors.primary },
  chartBarEmpty: { backgroundColor: colors.border },
  chartLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  chartFooter: { gap: 5, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  chartTotal: { color: colors.text, fontSize: 14, fontWeight: '700' },
  bars: { gap: 22 },
  barGroup: { gap: 10 },
  statusValue: { color: colors.text, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  track: { height: 9, borderRadius: 5, backgroundColor: colors.surface, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
});
