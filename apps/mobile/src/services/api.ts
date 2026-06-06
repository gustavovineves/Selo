import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

// Callback registrado pelo root layout para tratar sessão expirada definitivamente
type SessionExpiredHandler = () => void;
let onSessionExpired: SessionExpiredHandler | null = null;

export function registerSessionExpiredHandler(cb: SessionExpiredHandler): void {
  onSessionExpired = cb;
}

async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync('accessToken');
}

async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync('accessToken').catch(() => {});
  await SecureStore.deleteItemAsync('refreshToken').catch(() => {});
}

// Promise compartilhada para evitar múltiplos refresh simultâneos
let refreshInFlight: Promise<boolean> | null = null;

async function attemptTokenRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async (): Promise<boolean> => {
    try {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (!refreshToken) return false;

      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) return false;

      const data = (await res.json()) as { accessToken: string; refreshToken?: string };
      await SecureStore.setItemAsync('accessToken', data.accessToken);
      if (data.refreshToken) {
        await SecureStore.setItemAsync('refreshToken', data.refreshToken);
      }
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

// Não tenta refresh em rotas de autenticação para evitar loop infinito
function isAuthPath(path: string): boolean {
  return (
    path.startsWith('/auth/refresh') ||
    path.startsWith('/auth/login') ||
    path.startsWith('/auth/register')
  );
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  isRetry = false,
): Promise<T> {
  const token = await getAccessToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // Intercepta 401 — tenta refresh uma vez, nunca em rotas de auth e nunca em retry
  if (res.status === 401 && !isRetry && !isAuthPath(path)) {
    const refreshed = await attemptTokenRefresh();
    if (refreshed) {
      return request<T>(path, options, true);
    }
    // Refresh falhou — limpar sessão e notificar o root layout
    await clearTokens();
    onSessionExpired?.();
    throw Object.assign(new Error('SESSION_EXPIRED'), { status: 401 });
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Unknown error' }));
    throw Object.assign(new Error(body.message ?? `HTTP ${res.status}`), {
      status: res.status,
    });
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
