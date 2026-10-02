import { useCallback, useState } from 'react';
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

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);

    void getSalesTargets().then(result => {
      if (active) setSalesTargets(result);
    }).catch((requestError: unknown) => {
      if (!active) return;
      setError(requestError instanceof SalesTargetApiError
        ? requestError.message
        : '영업 대상 정보를 불러오지 못했습니다.');
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, []));

  return { salesTargets, loading, error };
}
