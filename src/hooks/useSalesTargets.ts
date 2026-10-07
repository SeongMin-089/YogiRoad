import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  getSalesTargets,
  SalesTargetApiError,
  type SalesTarget,
} from '../services/salesTargetApi';

export function useSalesTargets() {
  const [salesTargets, setSalesTargets] = useState<SalesTarget[]>([]);
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
      const result = await getSalesTargets();
      if (version === requestVersion.current) {
        setSalesTargets(result);
        setError(null);
      }
    } catch (requestError) {
      if (version !== requestVersion.current) return;
      setError(requestError instanceof SalesTargetApiError
        ? requestError.message
        : '영업 대상 정보를 불러오지 못했습니다.');
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
  const updateLocalSalesTarget = useCallback((updated: SalesTarget) => {
    setSalesTargets(previous => previous.map(target =>
      target.storeId === updated.storeId ? updated : target));
  }, []);
  const removeLocalSalesTarget = useCallback((storeId: string) => {
    setSalesTargets(previous => previous.filter(target => target.storeId !== storeId));
  }, []);

  return {
    salesTargets,
    loading,
    error,
    reload,
    updateLocalSalesTarget,
    removeLocalSalesTarget,
  };
}
