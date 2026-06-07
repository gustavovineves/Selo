'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminLayout } from '@/components/AdminLayout';
import { apiRequest, isAuthenticated } from '@/lib/api';
import type { AgreementSummary } from '@/lib/types';

interface AgreementsListResponse {
  data: AgreementSummary[];
  total: number;
  page: number;
  limit: number;
}

const OP_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Aguardando',
  ACTIVE: 'Ativo',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
  REJECTED: 'Recusado',
  DISPUTED: 'Em contestação',
  EXPIRED: 'Expirado',
};

const OP_STATUS_COLOR: Record<string, string> = {
  PENDING: '#D97706',
  ACTIVE: '#059669',
  COMPLETED: '#6B7280',
  CANCELLED: '#6B7280',
  REJECTED: '#DC2626',
  DISPUTED: '#DC2626',
  EXPIRED: '#6B7280',
};

const FIN_STATUS_LABEL: Record<string, string> = {
  NONE: '—',
  AWAITING_PAYMENT: 'Aguardando pag.',
  LOCKED: 'Travado',
  RELEASED: 'Liberado',
  REFUNDED: 'Reembolsado',
};

function shortId(id: string) { return id.slice(-8).toUpperCase(); }
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function formatAmount(amount: string | null, currency: string | null) {
  if (!amount) return '—';
  return parseFloat(amount).toLocaleString('pt-BR', { style: 'currency', currency: currency ?? 'BRL' });
}
function getName(user: { profile: { fullName: string | null; displayName: string | null } | null } | null) {
  return user?.profile?.displayName ?? user?.profile?.fullName ?? '—';
}

const TYPE_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'SIMPLE', label: 'Simples' },
  { value: 'WITH_GUARANTEE', label: 'Com garantia' },
];

const LIMIT = 20;

export default function AgreementsPage() {
  const router = useRouter();
  const [agreements, setAgreements] = useState<AgreementSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');

  const load = useCallback(async (pg: number, type: string) => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ page: String(pg), limit: String(LIMIT) });
      if (type) qs.set('type', type);
      const res = await apiRequest<AgreementsListResponse>(`/admin/agreements?${qs}`);
      setAgreements(res.data);
      setTotal(res.total);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar os acordos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }
    load(page, typeFilter);
  }, [router, load, page, typeFilter]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <AdminLayout>
      <div style={{ padding: 32 }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>
            Acordos
          </h1>
          <p style={{ color: '#6B7280', margin: 0, fontSize: 14 }}>
            {total} acordo{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setTypeFilter(f.value); setPage(1); }}
              style={{
                padding: '7px 16px', borderRadius: 999, fontSize: 13, cursor: 'pointer',
                border: '1px solid',
                borderColor: typeFilter === f.value ? '#5B21B6' : '#D1D5DB',
                background: typeFilter === f.value ? '#5B21B6' : '#fff',
                color: typeFilter === f.value ? '#fff' : '#374151',
                fontWeight: typeFilter === f.value ? 600 : 400,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading && <div style={{ color: '#6B7280' }}>Carregando...</div>}
        {error && (
          <div style={{ padding: '14px 18px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, color: '#991B1B', fontSize: 14, marginBottom: 20 }}>
            {error}
          </div>
        )}

        {!loading && !error && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  {['ID', 'Título', 'Criador', 'Tipo', 'Valor', 'Status', 'Fin.', 'Criado em'].map((h) => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6B7280', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agreements.map((a, i) => (
                  <tr key={a.id} style={{ borderBottom: i < agreements.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: '#9CA3AF', fontFamily: 'monospace' }}>
                      {shortId(a.id)}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 14, fontWeight: 500, color: '#111827', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.title}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#374151' }}>
                      {getName(a.payer)}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: a.financialGuarantee ? '#EDE9FE' : '#F3F4F6', color: a.financialGuarantee ? '#5B21B6' : '#6B7280' }}>
                        {a.financialGuarantee ? 'Com garantia' : 'Simples'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#374151', whiteSpace: 'nowrap' }}>
                      {formatAmount(a.financialGuarantee?.amount ?? null, a.financialGuarantee?.currency ?? null)}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                        color: OP_STATUS_COLOR[a.operationalStatus] ?? '#6B7280',
                        background: (OP_STATUS_COLOR[a.operationalStatus] ?? '#6B7280') + '18',
                      }}>
                        {OP_STATUS_LABEL[a.operationalStatus] ?? a.operationalStatus}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: '#6B7280' }}>
                      {FIN_STATUS_LABEL[a.financialStatus] ?? a.financialStatus}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#6B7280' }}>
                      {formatDate(a.createdAt)}
                    </td>
                  </tr>
                ))}
                {agreements.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>
                      Nenhum acordo encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 20, alignItems: 'center' }}>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: '8px 14px', borderRadius: 7, border: '1px solid #D1D5DB', background: '#fff', cursor: page === 1 ? 'default' : 'pointer', opacity: page === 1 ? 0.4 : 1, fontSize: 13 }}>
              ← Anterior
            </button>
            <span style={{ fontSize: 13, color: '#6B7280' }}>Página {page} de {totalPages} · {total} total</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: '8px 14px', borderRadius: 7, border: '1px solid #D1D5DB', background: '#fff', cursor: page === totalPages ? 'default' : 'pointer', opacity: page === totalPages ? 0.4 : 1, fontSize: 13 }}>
              Próxima →
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
