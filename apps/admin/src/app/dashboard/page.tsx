'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminLayout } from '@/components/AdminLayout';
import { apiRequest, isAuthenticated } from '@/lib/api';
import type { AdminStats } from '@/lib/types';

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: 24,
        border: '1px solid #E5E7EB',
        boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
      }}
    >
      <div
        style={{ fontSize: 13, color: '#6B7280', fontWeight: 500, marginBottom: 10 }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 38,
          fontWeight: 800,
          color: accent ?? '#111827',
          lineHeight: 1,
          letterSpacing: -1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>{sub}</div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    apiRequest<AdminStats>('/admin/stats')
      .then(setStats)
      .catch((e: unknown) =>
        setError(
          e instanceof Error ? e.message : 'Não foi possível carregar as estatísticas.',
        ),
      )
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <AdminLayout>
      <div style={{ padding: 32 }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: '#111827',
              margin: '0 0 4px',
            }}
          >
            Dashboard
          </h1>
          <p style={{ color: '#6B7280', margin: 0, fontSize: 14 }}>
            Visão geral operacional do Selo
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ color: '#6B7280', fontSize: 15 }}>Carregando...</div>
        )}

        {/* Error */}
        {error && (
          <div
            style={{
              padding: '14px 18px',
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: 10,
              color: '#991B1B',
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        {/* Stats */}
        {stats && (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 16,
                marginBottom: 28,
              }}
            >
              <StatCard label="Usuários cadastrados" value={stats.totalUsers} />
              <StatCard label="Combinados criados" value={stats.totalAgreements} />
              <StatCard
                label="Contestações totais"
                value={stats.totalDisputes}
              />
              <StatCard
                label="Contestações abertas"
                value={stats.openDisputes}
                accent={stats.openDisputes > 0 ? '#D97706' : '#059669'}
                sub={
                  stats.openDisputes > 0
                    ? 'Requerem análise'
                    : 'Nenhuma pendente'
                }
              />
            </div>

            {/* Alert if open disputes */}
            {stats.openDisputes > 0 && (
              <div
                style={{
                  background: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  borderRadius: 12,
                  padding: '18px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  marginBottom: 20,
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 700,
                      color: '#92400E',
                      fontSize: 15,
                      marginBottom: 3,
                    }}
                  >
                    {stats.openDisputes}{' '}
                    {stats.openDisputes === 1
                      ? 'contestação aberta'
                      : 'contestações abertas'}
                  </div>
                  <div style={{ color: '#B45309', fontSize: 13 }}>
                    Aguardando análise e decisão administrativa
                  </div>
                </div>
                <Link
                  href="/disputes?status=OPEN"
                  style={{
                    padding: '10px 20px',
                    background: '#D97706',
                    color: '#fff',
                    borderRadius: 8,
                    textDecoration: 'none',
                    fontSize: 13,
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  Ver contestações →
                </Link>
              </div>
            )}

            {/* Quick actions */}
            <div
              style={{
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
                marginBottom: 24,
              }}
            >
              <Link
                href="/disputes"
                style={{
                  padding: '10px 18px',
                  background: '#5B21B6',
                  color: '#fff',
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Ver todas as contestações
              </Link>
              <Link
                href="/disputes?status=OPEN"
                style={{
                  padding: '10px 18px',
                  background: '#fff',
                  color: '#374151',
                  border: '1px solid #D1D5DB',
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                Apenas abertas
              </Link>
            </div>

            <div style={{ fontSize: 12, color: '#9CA3AF' }}>
              Dados gerados em{' '}
              {new Date(stats.generatedAt).toLocaleString('pt-BR')}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
