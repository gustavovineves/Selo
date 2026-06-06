'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { saveAdminToken, isAuthenticated } from '@/lib/api';
import type { AdminLoginResponse } from '@/lib/types';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) router.replace('/dashboard');
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setError('Preencha email e senha.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

      const res = await fetch(`${apiUrl}/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      const data: unknown = await res.json().catch(() => ({}));

      if (!res.ok) {
        const raw = data as { message?: string | string[] };
        const msg = Array.isArray(raw.message)
          ? raw.message.join(', ')
          : (raw.message ?? 'Credenciais inválidas.');
        setError(msg);
        return;
      }

      const { accessToken } = data as AdminLoginResponse;
      saveAdminToken(accessToken);
      router.replace('/dashboard');
    } catch {
      setError(
        'Não foi possível conectar à API. Verifique se ela está rodando em ' +
          (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'),
      );
    } finally {
      setLoading(false);
    }
  };

  const inputBorder = (hasError: boolean) =>
    `1.5px solid ${hasError ? '#EF4444' : '#D1D5DB'}`;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: '48px 40px',
          width: '100%',
          maxWidth: 420,
          boxShadow: '0 32px 80px rgba(0,0,0,0.35)',
        }}
      >
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: '#1E1B4B',
              letterSpacing: -1,
              marginBottom: 4,
            }}
          >
            Selo
          </div>
          <div style={{ fontSize: 14, color: '#6B7280' }}>
            Painel Administrativo
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: '#374151',
                marginBottom: 7,
              }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@selo.app"
              autoComplete="email"
              style={{
                width: '100%',
                padding: '12px 14px',
                border: inputBorder(Boolean(error)),
                borderRadius: 8,
                fontSize: 14,
                color: '#111827',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Senha */}
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: '#374151',
                marginBottom: 7,
              }}
            >
              Senha
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{
                  width: '100%',
                  padding: '12px 44px 12px 14px',
                  border: inputBorder(Boolean(error)),
                  borderRadius: 8,
                  fontSize: 14,
                  color: '#111827',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9CA3AF',
                  fontSize: 15,
                  padding: 2,
                }}
                aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {error && (
            <div
              style={{
                padding: '10px 14px',
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: 8,
                color: '#991B1B',
                fontSize: 13,
                marginBottom: 20,
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email.trim() || !password}
            style={{
              width: '100%',
              padding: '14px',
              background: loading || !email.trim() || !password ? '#8B5CF6' : '#5B21B6',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              cursor: loading || !email.trim() || !password ? 'not-allowed' : 'pointer',
              opacity: loading || !email.trim() || !password ? 0.7 : 1,
            }}
          >
            {loading ? 'Autenticando...' : 'Entrar no painel'}
          </button>
        </form>

        {/* Nota de ambiente */}
        <div
          style={{
            marginTop: 24,
            padding: '12px 14px',
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: 8,
            fontSize: 12,
            color: '#92400E',
            lineHeight: 1.6,
          }}
        >
          <strong>Acesso restrito.</strong> Use as credenciais do{' '}
          <code style={{ fontFamily: 'monospace' }}>AdminUser</code> cadastrado
          no banco de dados. Configure{' '}
          <code style={{ fontFamily: 'monospace', background: '#FEF3C7', padding: '1px 4px', borderRadius: 3 }}>
            ADMIN_JWT_SECRET
          </code>{' '}
          em <code style={{ fontFamily: 'monospace' }}>apps/api/.env</code>.
        </div>
      </div>
    </div>
  );
}
