import { useState, useCallback } from 'react';
import { walletService } from '../services/wallet.service';
import type { WalletSummary } from '../types/api';

export function useSummary() {
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await walletService.getSummary();
      setSummary(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar carteira');
    } finally {
      setLoading(false);
    }
  }, []);

  return { summary, loading, error, refresh: load };
}
