import { useState, useCallback } from 'react';
import { authService } from '../services/auth.service';
import { receivingKeysService } from '../services/receiving-keys.service';
import { receivingDestinationsService } from '../services/receiving-destinations.service';
import type {
  AuthMeResponse,
  ReceivingKeyResponse,
  ReceivingDestinationResponse,
} from '../types/api';

interface ProfileData {
  me: AuthMeResponse;
  receivingKey: ReceivingKeyResponse | null;
  destinations: ReceivingDestinationResponse[];
}

export function useProfile() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [me, receivingKey, destinations] = await Promise.allSettled([
        authService.getMe(),
        receivingKeysService.getMe(),
        receivingDestinationsService.getMe(),
      ]);

      if (me.status === 'rejected') throw new Error('Não foi possível carregar o perfil');

      setProfile({
        me: (me as PromiseFulfilledResult<AuthMeResponse>).value,
        receivingKey:
          receivingKey.status === 'fulfilled'
            ? (receivingKey as PromiseFulfilledResult<ReceivingKeyResponse>).value
            : null,
        destinations:
          destinations.status === 'fulfilled'
            ? (destinations as PromiseFulfilledResult<ReceivingDestinationResponse[]>).value
            : [],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar perfil');
    } finally {
      setLoading(false);
    }
  }, []);

  return { profile, loading, error, refresh: load };
}
