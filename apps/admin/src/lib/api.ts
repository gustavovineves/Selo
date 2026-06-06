// ── Admin HTTP Client ─────────────────────────────────────────────────────────

const TOKEN_KEY = 'admin_token';

const getApiUrl = (): string =>
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export const getAdminToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
};

export const saveAdminToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearAdminToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

export const isAuthenticated = (): boolean => Boolean(getAdminToken());

// ── Error class ───────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Core request ──────────────────────────────────────────────────────────────

interface RequestOptions {
  method?: string;
  body?: unknown;
}

export async function apiRequest<T>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const token = getAdminToken();
  const url = `${getApiUrl()}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
    });
  } catch {
    throw new ApiError(0, 'Não foi possível conectar à API. Verifique se ela está rodando.');
  }

  if (res.status === 401 || res.status === 403) {
    clearAdminToken();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new ApiError(res.status, 'Sessão inválida. Faça login novamente.');
  }

  const data: unknown = await res.json().catch(() => ({}));

  if (!res.ok) {
    const raw = data as { message?: string | string[] };
    const msg = Array.isArray(raw.message)
      ? raw.message.join(', ')
      : (raw.message ?? `Erro ${res.status}`);
    throw new ApiError(res.status, msg);
  }

  return data as T;
}
