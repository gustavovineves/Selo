'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { saveAdminToken, isAuthenticated } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) router.replace('/dashboard');
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = token.trim();
    if (!trimmed) {
      setError('Informe o token de administrador.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

      // Raw fetch para evitar o redirect automático do apiRequest em 401
      const res = await fetch(`${apiUrl}/admin/health`, {
        headers: { 'X-Admin-Token': trimmed },
      });

      if (!res.ok) {
        setError(
          'Token inválido. Verifique o valor da variável ADMIN_TOKEN no backend.',
        );
        return;
      }

      saveAdminToken(trimmed);
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
              Token de administrador
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Cole o ADMIN_TOKEN aqui"
                autoComplete="off"
                spellCheck={false}
                style={{
                  width: '100%',
                  padding: '12px 44px 12px 14px',
                  border: `1.5px solid ${error ? '#EF4444' : '#D1D5DB'}`,
                  borderRadius: 8,
                  fontSize: 14,
                  color: '#111827',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: showToken ? 'monospace' : 'inherit',
                  letterSpacing: showToken ? 0 : 3,
                }}
              />
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
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
                aria-label={showToken ? 'Ocultar token' : 'Exibir token'}
              >
                {showToken ? '🙈' : '👁'}
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
            disabled={loading || !token.trim()}
            style={{
              width: '100%',
              padding: '14px',
              background: loading || !token.trim() ? '#8B5CF6' : '#5B21B6',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              cursor: loading || !token.trim() ? 'not-allowed' : 'pointer',
              opacity: loading || !token.trim() ? 0.7 : 1,
            }}
          >
            {loading ? 'Verificando...' : 'Entrar no painel'}
          </button>
        </form>

        {/* Dev note */}
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
          <strong>Ambiente de desenvolvimento.</strong> O token é definido pela
          variável de ambiente{' '}
          <code
            style={{
              fontFamily: 'monospace',
              background: '#FEF3C7',
              padding: '1px 4px',
              borderRadius: 3,
            }}
          >
            ADMIN_TOKEN
          </code>{' '}
          no arquivo <code style={{ fontFamily: 'monospace' }}>apps/api/.env</code>.
          Esta autenticação é provisória para MVP.
        </div>
      </div>
    </div>
  );
}
