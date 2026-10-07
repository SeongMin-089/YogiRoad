import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createSalesActivity,
  deleteSalesActivity,
  getSalesActivities,
  SalesActivityApiError,
  type CreateSalesActivityRequest,
  type SalesActivity,
} from '../services/salesActivityApi';

export function useSalesActivities(storeId: string | null) {
  const [activities, setActivities] = useState<SalesActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  useEffect(() => {
    const version = ++requestVersion.current;
    if (!storeId) {
      setActivities([]);
      setLoading(false);
      setError(null);
      return;
    }

    setActivities([]);
    setLoading(true);
    setError(null);
    void getSalesActivities(storeId).then(result => {
      if (version === requestVersion.current) setActivities(result);
    }).catch((requestError: unknown) => {
      if (version !== requestVersion.current) return;
      setError(requestError instanceof SalesActivityApiError
        ? requestError.message
        : '영업 활동을 불러오지 못했습니다.');
    }).finally(() => {
      if (version === requestVersion.current) setLoading(false);
    });

    return () => { requestVersion.current += 1; };
  }, [storeId]);

  const addActivity = useCallback(async (request: CreateSalesActivityRequest): Promise<void> => {
    if (!storeId) return;
    const created = await createSalesActivity(storeId, request);
    setActivities(previous => [
      created,
      ...previous.filter(activity => activity.id !== created.id),
    ]);
    setError(null);
  }, [storeId]);

  const removeActivity = useCallback(async (activityId: string): Promise<void> => {
    if (!storeId) return;
    await deleteSalesActivity(storeId, activityId);
    setActivities(previous => previous.filter(activity => activity.id !== activityId));
  }, [storeId]);

  return { activities, loading, error, addActivity, removeActivity };
}
