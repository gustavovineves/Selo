'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/AdminLayout';
import { apiRequest, isAuthenticated } from '@/lib/api';

interface UserListItem {
  id: string;
  email: string;
  status: string;
  createdAt: string;
  profile: { fullName: string | null; displayName: string | null } | null;
  trustScore: { score: number; level: string } | null;
  _count: { agreements: number };
}

interface UsersListResponse {
  data: UserListItem[];
  total: number;
  page: number;
  limit: number;
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Ativo',
  SUSPENDED: 'Suspenso',
  PENDING_VERIFICATION: 'Aguardando verificação',
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: '#059669',
  SUSPENDED: '#DC2626',
  PENDING_VERIFICATION: '#D97706',
};

function shortId(id: string) {
  return id.slice(-8).toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

const LIMIT = 20;

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async (pg: number) => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ page: String(pg), limit: String(LIMIT) });
      const res = await apiRequest<UsersListResponse>(`/admin/users?${qs}`);
      setUsers(res.data);
      setTotal(res.total);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar os usuários.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }
    load(page);
  }, [router, load, page]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <AdminLayout>
      <div style={{ padding: 32 }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>
            Usuários
          </h1>
          <p style={{ color: '#6B7280', margin: 0, fontSize: 14 }}>
            {total} usuário{total !== 1 ? 's' : ''} cadastrado{total !== 1 ? 's' : ''}
          </p>
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
                  {['ID', 'Nome', 'E-mail', 'Status', 'Score', 'Acordos', 'Cadastro'].map((h) => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6B7280', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#9CA3AF', fontFamily: 'monospace' }}>
                      {shortId(u.id)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 500, color: '#111827' }}>
                      {u.profile?.displayName ?? u.profile?.fullName ?? '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151' }}>
                      {u.email}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                        color: STATUS_COLOR[u.status] ?? '#6B7280',
                        background: (STATUS_COLOR[u.status] ?? '#6B7280') + '18',
                      }}>
                        {STATUS_LABEL[u.status] ?? u.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 14, color: '#374151' }}>
                      {u.trustScore?.score ?? '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 14, color: '#374151' }}>
                      {u._count.agreements}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#6B7280' }}>
                      {formatDate(u.createdAt)}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 20, alignItems: 'center' }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ padding: '8px 14px', borderRadius: 7, border: '1px solid #D1D5DB', background: '#fff', cursor: page === 1 ? 'default' : 'pointer', opacity: page === 1 ? 0.4 : 1, fontSize: 13 }}
            >
              ← Anterior
            </button>
            <span style={{ fontSize: 13, color: '#6B7280' }}>
              Página {page} de {totalPages} · {total} total
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{ padding: '8px 14px', borderRadius: 7, border: '1px solid #D1D5DB', background: '#fff', cursor: page === totalPages ? 'default' : 'pointer', opacity: page === totalPages ? 0.4 : 1, fontSize: 13 }}
            >
              Próxima →
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
