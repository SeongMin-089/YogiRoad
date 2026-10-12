import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { SalesTargetDetails } from '../components/sales/SalesTargetDetails';
import { ApiError } from '../services/apiClient';
import { getSalesTargets } from '../services/salesTargetApi';
import { SALES_STATUSES, type SalesStatus, type SalesTarget } from '../types/sales';
import styles from './SalesPage.module.scss';

type Filter = '전체' | SalesStatus;

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '날짜 확인 불가' : date.toLocaleDateString('ko-KR');
}

export function SalesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [targets, setTargets] = useState<SalesTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('전체');
  const [selected, setSelected] = useState<SalesTarget | null>(null);
  const requestVersion = useRef(0);

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    setError(null);
    try {
      const result = await getSalesTargets();
      if (version !== requestVersion.current) return;
      setTargets(result);
      const requestedStoreId = searchParams.get('storeId');
      if (requestedStoreId) setSelected(result.find(target => target.storeId === requestedStoreId) ?? null);
    } catch (requestError) {
      if (version === requestVersion.current) setError(requestError instanceof ApiError
        ? requestError.message : '영업 대상 목록을 불러오지 못했습니다.');
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    void load();
    return () => { requestVersion.current += 1; };
  }, [load]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ko-KR');
    return targets.filter(target => (filter === '전체' || target.status === filter)
      && (!normalized || [target.storeName, target.address, target.category]
        .some(value => value?.toLocaleLowerCase('ko-KR').includes(normalized))));
  }, [filter, query, targets]);

  const counts = useMemo(() => new Map<Filter, number>([
    ['전체', targets.length],
    ...SALES_STATUSES.map(status => [status, targets.filter(target => target.status === status).length] as const),
  ]), [targets]);

  function closeDetails(): void {
    setSelected(null);
    if (searchParams.has('storeId')) {
      const next = new URLSearchParams(searchParams);
      next.delete('storeId');
      setSearchParams(next, { replace: true });
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Sales CRM" title="영업관리" description="등록 매장의 상태와 상담·방문 활동을 관리합니다." />
      <div className={styles.toolbar}>
        <label className={styles.search}><Icon name="search" /><input value={query}
          onChange={event => setQuery(event.target.value)} placeholder="매장명, 주소 또는 업종 검색" /></label>
        <div className={styles.filters} aria-label="영업 상태 필터">
          {(['전체', ...SALES_STATUSES] as Filter[]).map(option => <button type="button" key={option}
            className={filter === option ? styles.active : ''} onClick={() => setFilter(option)}>
            {option} {counts.get(option) ?? 0}
          </button>)}
        </div>
      </div>
      <p className={styles.summary}>전체 {targets.length}곳 · 현재 조건 {filtered.length}곳</p>

      {loading ? <div className={styles.state}><span className="spinner" /><strong>영업 대상을 불러오는 중...</strong></div>
        : error ? <div className={styles.state}><strong>목록을 불러오지 못했습니다.</strong><span>{error}</span>
          <button className={styles.retry} type="button" onClick={() => { void load(); }}>다시 시도</button></div>
          : filtered.length === 0 ? <div className={styles.state}><strong>{targets.length ? '검색 조건에 맞는 매장이 없습니다.' : '등록된 영업 대상이 없습니다.'}</strong>
            <span>{targets.length ? '검색어나 상태 필터를 변경해 보세요.' : '지도에서 음식점을 찾아 영업 대상으로 등록해 보세요.'}</span></div>
            : <div className={styles.list}>{filtered.map(target => <button type="button" className={styles.card}
              key={target.storeId} onClick={() => setSelected(target)}>
              <div className={styles.cardTop}><h2>{target.storeName}</h2><span className={styles.status}>{target.status}</span></div>
              <p>{target.category || '업종 정보 없음'} · {target.address || '주소 정보 없음'}</p>
              <div className={styles.cardMeta}><span>등록 {formatDate(target.registeredAt)}</span><span>{target.memo ? '메모 있음' : '메모 없음'}</span></div>
            </button>)}</div>}

      {selected && <SalesTargetDetails target={selected} onClose={closeDetails}
        onUpdated={updated => {
          setTargets(previous => previous.map(target => target.storeId === updated.storeId ? updated : target));
          setSelected(updated);
        }}
        onDeleted={storeId => {
          setTargets(previous => previous.filter(target => target.storeId !== storeId));
          closeDetails();
        }} />}
    </div>
  );
}
