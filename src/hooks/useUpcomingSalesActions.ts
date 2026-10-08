import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  getUpcomingSalesActions,
  SalesActivityApiError,
  type UpcomingSalesAction,
} from '../services/salesActivityApi';

export function useUpcomingSalesActions() {
  const [actions, setActions] = useState<UpcomingSalesAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const hasLoaded = useRef(false);

  const load = useCallback(async (showLoading: boolean): Promise<void> => {
    const version = ++requestVersion.current;
    if (showLoading) {
      setLoading(true);
      setError(null);
    }

    try {
      const result = await getUpcomingSalesActions();
      if (version === requestVersion.current) {
        setActions(result);
        setError(null);
      }
    } catch (requestError) {
      if (version !== requestVersion.current) return;
      setError(requestError instanceof SalesActivityApiError
        ? requestError.message
        : '다가오는 영업 일정을 불러오지 못했습니다.');
    } finally {
      if (version === requestVersion.current) {
        hasLoaded.current = true;
        setLoading(false);
      }
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void load(!hasLoaded.current);
    return () => { requestVersion.current += 1; };
  }, [load]));

  const reload = useCallback(() => load(false), [load]);
  return { actions, loading, error, reload };
}
