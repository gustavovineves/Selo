'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminLayout } from '@/components/AdminLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { apiRequest, isAuthenticated } from '@/lib/api';
import type { DisputeListItem, DisputeListResponse } from '@/lib/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { value: '',                           label: 'Todas' },
  { value: 'OPEN',                       label: 'Abertas' },
  { value: 'UNDER_REVIEW',               label: 'Em análise' },
  { value: 'RESOLVED_FAVOR_CREATOR',     label: 'Reembolsadas' },
  { value: 'RESOLVED_FAVOR_COUNTERPART', label: 'Liberadas' },
  { value: 'CLOSED',                     label: 'Encerradas' },
];

function shortId(id: string): string {
  return id.slice(-8).toUpperCase();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAmount(amount: string | null, currency: string | null): string {
  if (!amount) return '—';
  return parseFloat(amount).toLocaleString('pt-BR', {
    style: 'currency',
    currency: currency ?? 'BRL',
  });
}

function getName(
  user: { profile: { fullName: string | null; displayName: string | null } | null } | null,
): string {
  return user?.profile?.displayName ?? user?.profile?.fullName ?? '—';
}

// ── Page ─────────────────────────────────────────────────────────────────────

const LIMIT = 20;

export default function DisputesPage() {
  const router = useRouter();
  const [disputes, setDisputes] = useState<DisputeListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async (status: string, pg: number) => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      if (status) qs.set('status', status);
      qs.set('page', String(pg));
      qs.set('limit', String(LIMIT));
      const res = await apiRequest<DisputeListResponse>(
        `/admin/disputes?${qs.toString()}`,
      );
      setDisputes(res.data);
      setTotal(res.total);
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : 'Não foi possível carregar as contestações.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }
    load(statusFilter, page);
  }, [router, load, statusFilter, page]);

  const handleStatusChange = (s: string) => {
    setStatusFilter(s);
    setPage(1);
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <AdminLayout>
      <div style={{ padding: 32 }}>
        {/* Header */}
        <div
          style={{
            marginBottom: 24,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: '#111827',
                margin: '0 0 4px',
              }}
            >
              Contestações
            </h1>
            <p style={{ color: '#6B7280', margin: 0, fontSize: 14 }}>
              {loading
                ? 'Carregando...'
                : `${total} ${total !== 1 ? 'contestações encontradas' : 'contestação encontrada'}`}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div
          style={{ marginBottom: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}
        >
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => handleStatusChange(f.value)}
              style={{
                padding: '7px 16px',
                borderRadius: 20,
                border: '1.5px solid',
                borderColor: statusFilter === f.value ? '#5B21B6' : '#D1D5DB',
                background: statusFilter === f.value ? '#5B21B6' : '#fff',
                color: statusFilter === f.value ? '#fff' : '#374151',
                fontSize: 13,
                fontWeight: statusFilter === f.value ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

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
              marginBottom: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            {error}
            <button
              onClick={() => load(statusFilter, page)}
              style={{
                background: 'none',
                border: 'none',
                color: '#991B1B',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: 13,
                flexShrink: 0,
                marginLeft: 12,
              }}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && !disputes.length && (
          <div style={{ padding: 48, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>
            Carregando contestações...
          </div>
        )}

        {/* Empty */}
        {!loading && !error && disputes.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '64px 0',
              color: '#6B7280',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚖️</div>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
              Nenhuma contestação encontrada
            </div>
            <div style={{ fontSize: 13 }}>Tente ajustar os filtros.</div>
          </div>
        )}

        {/* Table */}
        {disputes.length > 0 && (
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              border: '1px solid #E5E7EB',
              boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
              overflow: 'hidden',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                <thead>
                  <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                    {['ID', 'Status', 'Acordo / Valor', 'Contestado por', 'Pagador → Recebedor', 'Aberta em', ''].map(
                      (h) => (
                        <th
                          key={h}
                          style={{
                            padding: '12px 16px',
                            textAlign: 'left',
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#6B7280',
                            letterSpacing: 0.6,
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {disputes.map((d) => (
                    <tr
                      key={d.id}
                      style={{
                        borderBottom: '1px solid #F3F4F6',
                        background: d.status === 'OPEN' ? '#FFFBEB' : '#fff',
                      }}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <code
                          style={{
                            fontSize: 12,
                            color: '#6B7280',
                            fontFamily: 'monospace',
                            background: '#F3F4F6',
                            padding: '2px 6px',
                            borderRadius: 4,
                          }}
                        >
                          #{shortId(d.id)}
                        </code>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <StatusBadge status={d.status} type="dispute" />
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>
                          {d.agreement.title}
                        </div>
                        <div style={{ color: '#6B7280', fontSize: 12, marginTop: 2 }}>
                          {formatAmount(d.agreement.amount, d.agreement.currency)}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151' }}>
                        {getName(d.openedBy)}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13 }}>
                        <span style={{ color: '#6B7280' }}>{getName(d.agreement.payer)}</span>
                        <span style={{ margin: '0 6px', color: '#D1D5DB' }}>→</span>
                        <span style={{ color: '#374151' }}>{getName(d.agreement.receiver)}</span>
                      </td>
                      <td
                        style={{
                          padding: '14px 16px',
                          fontSize: 12,
                          color: '#6B7280',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatDate(d.createdAt)}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <Link
                          href={`/disputes/${d.id}`}
                          style={{
                            padding: '7px 14px',
                            background: d.status === 'OPEN' ? '#5B21B6' : '#F3F4F6',
                            color: d.status === 'OPEN' ? '#fff' : '#374151',
                            borderRadius: 7,
                            textDecoration: 'none',
                            fontSize: 13,
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {d.status === 'OPEN' ? 'Analisar →' : 'Ver detalhes'}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  borderTop: '1px solid #E5E7EB',
                }}
              >
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 7,
                    border: '1px solid #D1D5DB',
                    background: page === 1 ? '#F9FAFB' : '#fff',
                    cursor: page === 1 ? 'not-allowed' : 'pointer',
                    color: '#374151',
                    fontSize: 13,
                    opacity: page === 1 ? 0.5 : 1,
                  }}
                >
                  ← Anterior
                </button>
                <span style={{ fontSize: 13, color: '#6B7280', padding: '0 8px' }}>
                  Página {page} de {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 7,
                    border: '1px solid #D1D5DB',
                    background: page === totalPages ? '#F9FAFB' : '#fff',
                    cursor: page === totalPages ? 'not-allowed' : 'pointer',
                    color: '#374151',
                    fontSize: 13,
                    opacity: page === totalPages ? 0.5 : 1,
                  }}
                >
                  Próxima →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
