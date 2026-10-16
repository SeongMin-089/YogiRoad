import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Icon } from '../Icon';
import {
  createSalesActivity,
  deleteSalesActivity,
  getSalesActivities,
} from '../../services/salesActivityApi';
import { ApiError } from '../../services/apiClient';
import { deleteSalesTarget, updateSalesTarget } from '../../services/salesTargetApi';
import {
  SALES_ACTIVITY_TYPES,
  SALES_STATUSES,
  type SalesActivity,
  type SalesActivityType,
  type SalesTarget,
} from '../../types/sales';
import styles from './SalesTargetDetails.module.scss';

type Props = {
  target: SalesTarget;
  onClose: () => void;
  onUpdated: (target: SalesTarget) => void;
  onDeleted: (storeId: string) => void;
};

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '날짜 확인 불가';
  return date.toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '날짜 확인 불가' : date.toLocaleDateString('ko-KR');
}

export function SalesTargetDetails({ target, onClose, onUpdated, onDeleted }: Props) {
  const [status, setStatus] = useState(target.status);
  const [memo, setMemo] = useState(target.memo ?? '');
  const [saving, setSaving] = useState(false);
  const [activities, setActivities] = useState<SalesActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [activityType, setActivityType] = useState<SalesActivityType>('방문');
  const [content, setContent] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null);

  useEffect(() => {
    setStatus(target.status);
    setMemo(target.memo ?? '');
  }, [target]);

  useEffect(() => {
    let active = true;
    setActivitiesLoading(true);
    setActivityError(null);
    void getSalesActivities(target.storeId)
      .then(result => { if (active) setActivities(result); })
      .catch(error => { if (active) setActivityError(errorMessage(error, '영업 활동을 불러오지 못했습니다.')); })
      .finally(() => { if (active) setActivitiesLoading(false); });
    return () => { active = false; };
  }, [target.storeId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const upcoming = useMemo(() => activities
    .filter(activity => activity.nextActionAt && new Date(activity.nextActionAt).getTime() >= Date.now())
    .sort((a, b) => new Date(a.nextActionAt!).getTime() - new Date(b.nextActionAt!).getTime())[0], [activities]);

  async function save(): Promise<void> {
    if (saving) return;
    setSaving(true);
    try {
      onUpdated(await updateSalesTarget(target.storeId, { status, memo: memo.trim() }));
      window.alert('영업 정보가 저장되었습니다.');
    } catch (error) {
      window.alert(errorMessage(error, '영업 정보를 저장하지 못했습니다.'));
    } finally {
      setSaving(false);
    }
  }

  async function removeTarget(): Promise<void> {
    if (!window.confirm(`${target.storeName}을(를) 영업 대상에서 삭제하시겠습니까?\n관련 활동 기록도 함께 삭제됩니다.`)) return;
    setSaving(true);
    try {
      await deleteSalesTarget(target.storeId);
      onDeleted(target.storeId);
    } catch (error) {
      window.alert(errorMessage(error, '영업 대상을 삭제하지 못했습니다.'));
      setSaving(false);
    }
  }

  async function addActivity(event: FormEvent): Promise<void> {
    event.preventDefault();
    const normalizedContent = content.trim();
    if (!normalizedContent) {
      window.alert('오늘 진행한 영업 활동 내용을 입력해 주세요.');
      return;
    }
    setAdding(true);
    try {
      const created = await createSalesActivity(target.storeId, {
        type: activityType,
        content: normalizedContent,
        nextActionAt: nextActionDate ? `${nextActionDate}T00:00:00+09:00` : null,
      });
      setActivities(previous => [created, ...previous.filter(item => item.id !== created.id)]);
      setContent('');
      setNextActionDate('');
      setActivityError(null);
    } catch (error) {
      window.alert(errorMessage(error, '영업 활동을 추가하지 못했습니다.'));
    } finally {
      setAdding(false);
    }
  }

  async function removeActivity(activityId: string): Promise<void> {
    if (!window.confirm('이 영업 활동 기록을 삭제하시겠습니까?')) return;
    setDeletingActivityId(activityId);
    try {
      await deleteSalesActivity(target.storeId, activityId);
      setActivities(previous => previous.filter(item => item.id !== activityId));
    } catch (error) {
      window.alert(errorMessage(error, '영업 활동 기록을 삭제하지 못했습니다.'));
    } finally {
      setDeletingActivityId(null);
    }
  }

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="target-detail-title">
        <header className={styles.sheetHeader}>
          <div><span>영업 대상 상세</span><h2 id="target-detail-title">{target.storeName}</h2></div>
          <button type="button" onClick={onClose} aria-label="상세 닫기"><Icon name="close" /></button>
        </header>

        <div className={styles.body}>
          <section className={styles.storeCard}>
            <span className={styles.category}>{target.category || '업종 정보 없음'}</span>
            <p>{target.address || '주소 정보 없음'}</p>
            <small>등록일 {formatDate(target.registeredAt)}</small>
          </section>

          <section className={styles.section}>
            <h3>영업 상태</h3>
            <div className={styles.chips}>
              {SALES_STATUSES.map(option => <button
                type="button" key={option} disabled={saving}
                data-status={option}
                className={status === option ? styles.selectedChip : ''}
                onClick={() => setStatus(option)}
              >{option}</button>)}
            </div>
            <label htmlFor="sales-memo">메모</label>
            <textarea
              id="sales-memo" value={memo} maxLength={2000} disabled={saving}
              onChange={event => setMemo(event.target.value)}
              placeholder="담당자, 상담 내용, 다음 연락 계획을 기록해 주세요."
            />
            <small className={styles.counter}>{memo.length}/2000</small>
            <button className={styles.primaryButton} type="button" disabled={saving} onClick={() => { void save(); }}>
              {saving ? '저장 중...' : '영업 정보 저장'}
            </button>
          </section>

          <section className={styles.section}>
            <h3>방문·상담 기록</h3>
            <form className={styles.activityForm} onSubmit={event => { void addActivity(event); }}>
              <span className={styles.fieldLabel}>활동 종류</span>
              <div className={styles.chips}>
                {SALES_ACTIVITY_TYPES.map(option => <button
                  type="button" key={option} disabled={adding}
                  className={activityType === option ? styles.selectedChip : ''}
                  onClick={() => setActivityType(option)}
                >{option}</button>)}
              </div>
              <label htmlFor="activity-content">활동 내용</label>
              <textarea
                id="activity-content" value={content} maxLength={2000} disabled={adding}
                onChange={event => setContent(event.target.value)}
                placeholder="오늘 진행한 상담이나 방문 내용을 입력해 주세요."
              />
              <label htmlFor="next-action">다음 액션 날짜 <small>(선택)</small></label>
              <input id="next-action" type="date" value={nextActionDate} disabled={adding}
                onChange={event => setNextActionDate(event.target.value)} />
              <button className={styles.primaryButton} type="submit" disabled={adding}>
                {adding ? '추가 중...' : '활동 기록 추가'}
              </button>
            </form>

            {upcoming && <div className={styles.upcoming}>
              <strong>다가오는 다음 액션</strong>
              <span>{formatDate(upcoming.nextActionAt!)}</span>
              <small>{upcoming.type} 기록에 등록된 일정</small>
            </div>}

            {activitiesLoading ? <p className={styles.empty}>영업 활동을 불러오는 중...</p>
              : activityError ? <p className={styles.error}>{activityError}</p>
                : activities.length === 0 ? <p className={styles.empty}>아직 등록된 영업 활동이 없습니다.</p>
                  : <div className={styles.activityList}>{activities.map(activity => <article key={activity.id}>
                    <div className={styles.activityMeta}><strong>{activity.type}</strong><time>{formatDateTime(activity.createdAt)}</time></div>
                    <p>{activity.content}</p>
                    {activity.nextActionAt && <small>다음 액션 · {formatDate(activity.nextActionAt)}</small>}
                    <button type="button" disabled={deletingActivityId !== null}
                      onClick={() => { void removeActivity(activity.id); }}>
                      {deletingActivityId === activity.id ? '삭제 중...' : '기록 삭제'}
                    </button>
                  </article>)}</div>}
          </section>

          <button className={styles.deleteTarget} type="button" disabled={saving} onClick={() => { void removeTarget(); }}>
            영업 대상 삭제
          </button>
        </div>
      </section>
    </div>
  );
}
