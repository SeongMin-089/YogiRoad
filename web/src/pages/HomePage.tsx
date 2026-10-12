import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Icon } from '../components/Icon';
import { SalesTargetDetails } from '../components/sales/SalesTargetDetails';
import { ApiError } from '../services/apiClient';
import { getUpcomingSalesActions } from '../services/salesActivityApi';
import { getSalesPriorities, getSalesTargets } from '../services/salesTargetApi';
import type { SalesPriority, SalesTarget, UpcomingSalesAction } from '../types/sales';
import styles from './HomePage.module.scss';

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '날짜 확인 불가' : date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
}

export function HomePage() {
  const { user, profile } = useAuth();
  const nickname = profile?.effectiveName?.trim() || user?.nickname?.trim();
  const [targets, setTargets] = useState<SalesTarget[]>([]);
  const [priorities, setPriorities] = useState<SalesPriority[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingSalesAction[]>([]);
  const [selected, setSelected] = useState<SalesTarget | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [targetResult, priorityResult, upcomingResult] = await Promise.allSettled([
      getSalesTargets(), getSalesPriorities(), getUpcomingSalesActions(),
    ]);
    if (targetResult.status === 'fulfilled') setTargets(targetResult.value);
    else setError(targetResult.reason instanceof ApiError ? targetResult.reason.message : '영업 데이터를 불러오지 못했습니다.');
    setPriorities(priorityResult.status === 'fulfilled' ? priorityResult.value : []);
    setUpcoming(upcomingResult.status === 'fulfilled' ? upcomingResult.value : []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const summary = useMemo(() => ({
    total: targets.length,
    consulting: targets.filter(target => target.status === '상담중').length,
    revisit: targets.filter(target => target.status === '재방문').length,
    completed: targets.filter(target => target.status === '계약완료').length,
  }), [targets]);
  const unvisited = useMemo(() => targets.filter(target => target.status === '미방문').slice(0, 5), [targets]);

  function openTarget(storeId: string): void {
    const target = targets.find(item => item.storeId === storeId);
    if (target) setSelected(target);
  }

  return (
    <div>
      <header className={styles.greeting}><span>오늘도 좋은 하루예요</span><h1>{nickname ? `${nickname}님, 안녕하세요.` : '안녕하세요.'}</h1>
        <p>등록한 영업 대상과 오늘의 다음 일정을 확인해 보세요.</p></header>

      <section className={styles.stats} aria-label="영업 현황">
        <article className={styles.stat}><span>전체 매장</span><strong>{loading ? '–' : summary.total}</strong></article>
        <article className={styles.stat}><span>상담중</span><strong>{loading ? '–' : summary.consulting}</strong></article>
        <article className={styles.stat}><span>재방문</span><strong>{loading ? '–' : summary.revisit}</strong></article>
        <article className={styles.stat}><span>계약완료</span><strong>{loading ? '–' : summary.completed}</strong></article>
      </section>

      <nav className={styles.quick} aria-label="빠른 메뉴">
        <Link to="/map"><span><Icon name="map" /></span>음식점 찾기</Link>
        <Link to="/sales"><span><Icon name="briefcase" /></span>영업관리</Link>
        <Link to="/dashboard"><span><Icon name="chart" /></span>실적 보기</Link>
      </nav>

      {error && <p className={styles.error}>{error} <button className={styles.refresh} type="button" onClick={() => { void load(); }}>다시 시도</button></p>}

      <div className={styles.contentGrid}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}><h2>다가오는 영업 일정</h2><Link to="/sales">전체 보기</Link></div>
          {loading ? <p className={styles.empty}>일정을 불러오는 중...</p>
            : upcoming.length === 0 ? <p className={styles.empty}>등록된 다음 영업 일정이 없습니다.</p>
              : <div className={styles.list}>{upcoming.slice(0, 5).map(action => <button className={styles.item} type="button"
                key={action.activityId} onClick={() => openTarget(action.storeId)}>
                <div className={styles.itemTop}><strong>{action.storeName}</strong><span>{formatDate(action.nextActionAt)}</span></div>
                <p>{action.type} · {action.content}</p><small>{action.status} · {action.address}</small>
              </button>)}</div>}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}><h2>우선 영업 추천</h2><Link to="/sales">전체 보기</Link></div>
          {loading ? <p className={styles.empty}>추천 대상을 분석하는 중...</p>
            : priorities.length === 0 ? <p className={styles.empty}>추천할 영업 대상이 없습니다.</p>
              : <div className={styles.list}>{priorities.slice(0, 5).map(priority => <button className={styles.item} type="button"
                key={priority.storeId} onClick={() => openTarget(priority.storeId)}>
                <div className={styles.itemTop}><strong>{priority.storeName}</strong><span className={styles.priority}>우선순위 {priority.priorityScore}</span></div>
                <p>{priority.reason}</p><small>{priority.status} · {priority.category}</small>
              </button>)}</div>}
        </section>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}><h2>아직 방문하지 않은 매장</h2><Link to="/sales">전체 보기</Link></div>
        {loading ? <p className={styles.empty}>매장을 불러오는 중...</p>
          : unvisited.length === 0 ? <p className={styles.empty}>미방문 상태의 매장이 없습니다.</p>
            : <div className={styles.list}>{unvisited.map(target => <button className={styles.item} type="button"
              key={target.storeId} onClick={() => setSelected(target)}>
              <div className={styles.itemTop}><strong>{target.storeName}</strong><span>{target.status}</span></div>
              <p>{target.category}</p><small>{target.address}</small>
            </button>)}</div>}
      </section>

      {selected && <SalesTargetDetails target={selected} onClose={() => setSelected(null)}
        onUpdated={updated => {
          setTargets(previous => previous.map(target => target.storeId === updated.storeId ? updated : target));
          setSelected(updated);
        }}
        onDeleted={storeId => { setTargets(previous => previous.filter(target => target.storeId !== storeId)); setSelected(null); }} />}
    </div>
  );
}
