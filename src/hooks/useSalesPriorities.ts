import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  getSalesPriorities,
  SalesTargetApiError,
  type SalesPriority,
} from '../services/salesTargetApi';

export function useSalesPriorities() {
  const [priorities, setPriorities] = useState<SalesPriority[]>([]);
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
      const result = await getSalesPriorities();
      if (version === requestVersion.current) {
        setPriorities(result);
        setError(null);
      }
    } catch (requestError) {
      if (version !== requestVersion.current) return;
      setError(requestError instanceof SalesTargetApiError
        ? requestError.message
        : '우선 확인 매장을 불러오지 못했습니다.');
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
  return { priorities, loading, error, reload };
}
