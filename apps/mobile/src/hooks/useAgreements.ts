import { useState, useCallback } from 'react';
import { agreementsService, ListAgreementsParams } from '../services/agreements.service';
import type { AgreementListItem } from '../types/api';

export function useAgreements(defaultParams?: ListAgreementsParams) {
  const [agreements, setAgreements] = useState<AgreementListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (params?: ListAgreementsParams) => {
    setLoading(true);
    setError(null);
    try {
      const res = await agreementsService.list({ ...defaultParams, ...params });
      setAgreements(res.data);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar combinados');
    } finally {
      setLoading(false);
    }
  }, [defaultParams]);

  return { agreements, total, loading, error, refresh: load };
}
