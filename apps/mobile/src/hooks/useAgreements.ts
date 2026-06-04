import { useState, useEffect } from 'react';
import { agreementsService } from '../services/agreements.service';
import type { Agreement } from '@selo/types';

export function useAgreements() {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await agreementsService.list();
      setAgreements(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar combinados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return { agreements, loading, error, refresh: load };
}
