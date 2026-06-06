import { useState, useCallback } from 'react';
import { authService } from '../services/auth.service';
import { router } from 'expo-router';

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      await authService.login({ email, password });
      router.replace('/(app)/home');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(
    async (data: { email: string; password: string; firstName: string; lastName?: string }) => {
      setLoading(true);
      setError(null);
      try {
        await authService.register(data);
        router.replace('/(app)/home');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao criar conta');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    await authService.logout();
    router.replace('/(auth)/login');
  }, []);

  return { login, register, logout, loading, error };
}
