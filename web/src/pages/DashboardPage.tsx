import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { ApiError } from '../services/apiClient';
import { getSalesDashboard } from '../services/salesInsightsApi';
import type { DashboardPeriod, SalesDashboard, SalesStatus } from '../types/sales';
import styles from './DashboardPage.module.scss';

const periodLabels: Record<DashboardPeriod, string> = { WEEK: '이번 주', MONTH: '이번 달', ALL: '전체' };
const statusColors: Record<SalesStatus, string> = {
  미방문: '#9aa3b2', 상담중: '#5b8def', 재방문: '#f4a340', 계약완료: '#31a66a', 거절: '#d9686c',
};

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '날짜 확인 불가' : date.toLocaleDateString('ko-KR');
}

export function DashboardPage() {
  const [dashboard, setDashboard] = useState<SalesDashboard | null>(null);
  const [period, setPeriod] = useState<DashboardPeriod>('WEEK');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDashboard(await getSalesDashboard());
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : '대시보드 통계를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const maxConsultations = useMemo(() => Math.max(1, ...(dashboard?.weeklyConsultations.map(item => item.consultations) ?? [0])), [dashboard]);
  const weeklyTotal = useMemo(() => dashboard?.weeklyConsultations.reduce((sum, item) => sum + item.consultations, 0) ?? 0, [dashboard]);

  return (
    <div>
      <PageHeader eyebrow="Performance" title="대시보드" description="실제 Firebase 영업 데이터로 성과와 활동 흐름을 확인합니다." />
      <div className={styles.periods} aria-label="실적 기간">
        {(Object.keys(periodLabels) as DashboardPeriod[]).map(option => <button type="button" key={option}
          className={period === option ? styles.active : ''} onClick={() => setPeriod(option)}>{periodLabels[option]}</button>)}
      </div>

      {loading ? <div className={styles.state}><span className="spinner" /><strong>실적을 집계하는 중...</strong></div>
        : error || !dashboard ? <div className={styles.state}><strong>대시보드를 불러오지 못했습니다.</strong><span>{error}</span>
          <button className={styles.retry} type="button" onClick={() => { void load(); }}>다시 시도</button></div>
          : <>
            <section className={styles.metrics} aria-label="핵심 실적">
              <article className={styles.metric}><span>전체 등록 매장</span><strong>{dashboard.summary.totalRegisteredStores}</strong><small>{periodLabels[period]} 등록 {dashboard.periods[period].registeredStores}곳</small></article>
              <article className={styles.metric}><span>계약 완료 매장</span><strong>{dashboard.summary.completedContracts}</strong><small>현재 상태 기준</small></article>
              <article className={styles.metric}><span>계약 전환율</span><strong>{dashboard.summary.conversionRate.toFixed(1)}%</strong><small>계약완료 ÷ 전체 등록</small></article>
              <article className={styles.metric}><span>이번 주 상담</span><strong>{dashboard.summary.thisWeekConsultations}</strong><small>{periodLabels[period]} 상담 {dashboard.periods[period].consultations}건</small></article>
            </section>

            <div className={styles.dashboardGrid}>
              <section className={styles.section}>
                <div className={styles.heading}><h2>주간 상담 활동</h2><span>월요일–일요일</span></div>
                <div className={styles.chart} aria-label={`이번 주 상담 총 ${weeklyTotal}건`}>
                  {dashboard.weeklyConsultations.map(item => <div className={styles.barGroup} key={item.date}>
                    <div className={styles.barTrack}><div className={styles.bar}
                      style={{ height: `${item.consultations === 0 ? 2 : Math.max(12, item.consultations / maxConsultations * 100)}%` }}>
                      <span>{item.consultations}</span></div></div><small>{item.dayLabel}</small>
                  </div>)}
                </div>
                <p className={styles.chartSummary}>이번 주 상담 합계 {weeklyTotal}건</p>
              </section>

              <section className={styles.section}>
                <div className={styles.heading}><h2>영업 진행 현황</h2><span>전체 등록 기준</span></div>
                <div className={styles.progressList}>{dashboard.statusProgress.map(item => <div className={styles.progressRow} key={item.status}>
                  <div className={styles.progressMeta}><strong>{item.status}</strong><span>{item.count}곳 · {item.percentage.toFixed(1)}%</span></div>
                  <div className={styles.track}><div className={styles.fill}
                    style={{ width: `${Math.min(100, item.percentage)}%`, backgroundColor: statusColors[item.status] }} /></div>
                </div>)}</div>
              </section>
            </div>

            <section className={styles.section}>
              <div className={styles.heading}><h2>최근 계약 완료 매장</h2><span>{dashboard.recentCompletedStores.length}곳</span></div>
              {dashboard.recentCompletedStores.length === 0 ? <p className={styles.note}>아직 계약 완료 매장이 없습니다.</p>
                : <div className={styles.recentList}>{dashboard.recentCompletedStores.map(store => <Link
                  className={styles.recent} to={`/sales?storeId=${encodeURIComponent(store.storeId)}`} key={store.storeId}>
                  <strong>{store.storeName}</strong><span>{store.category} · {store.address}</span><small>등록일 {formatDate(store.registeredAt)}</small>
                </Link>)}</div>}
              <p className={styles.note}>계약 완료일 이력이 별도로 저장되지 않아 최근 목록은 등록일 순으로만 표시합니다. 등록일을 계약일로 간주하지 않습니다.</p>
            </section>
          </>}
    </div>
  );
}
