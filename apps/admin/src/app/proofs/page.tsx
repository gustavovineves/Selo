'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/AdminLayout';
import { apiRequest, isAuthenticated } from '@/lib/api';

interface AdminProof {
  id: string;
  eventType: string | null;
  status: string;
  proofHash: string | null;
  txHash: string | null;
  network: string;
  provider: string;
  createdAt: string;
  submittedAt: string | null;
  confirmedAt: string | null;
  errorMessage: string | null;
  retryCount: number;
  humanMessage: string;
}

const STATUS_COLOR: Record<string, string> = {
  SUBMITTED: '#059669',
  CONFIRMED: '#5B21B6',
  PENDING: '#D97706',
  FAILED: '#DC2626',
};

const EVENT_LABEL: Record<string, string> = {
  AGREEMENT_CREATED: 'Combinado criado',
  AGREEMENT_ACCEPTED: 'Combinado aceito',
  PAYOUT_COMPLETED: 'Valor liberado',
  REFUND_COMPLETED: 'Reembolso',
  DISPUTE_OPENED: 'Contestação aberta',
  DISPUTE_RESOLVED: 'Contestação resolvida',
  DUAL_CONFIRMATION_PAYOUT: 'Liberação por dupla confirmação',
};

function shortHash(hash: string | null) {
  if (!hash) return '—';
  return hash.slice(0, 16) + '…';
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function ProofsPage() {
  const router = useRouter();
  const [agreementId, setAgreementId] = useState('');
  const [proofs, setProofs] = useState<AdminProof[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) router.replace('/login');
  }, [router]);

  async function handleSearch() {
    if (!agreementId.trim()) return;
    setLoading(true);
    setError('');
    setSearched(false);
    try {
      const data = await apiRequest<AdminProof[]>(`/admin/agreements/${agreementId.trim()}/proofs`);
      setProofs(data);
      setSearched(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Acordo não encontrado ou sem registros de prova.');
      setProofs([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminLayout>
      <div style={{ padding: 32 }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>
            Registros de Prova
          </h1>
          <p style={{ color: '#6B7280', margin: 0, fontSize: 14 }}>
            Consulte os registros de prova de um acordo pelo ID.
            A blockchain registra a prova do evento — não o dinheiro.
          </p>
        </div>

        {/* Disclaimer */}
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#78350F', marginBottom: 24, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span>⚠️</span>
          <span>
            <strong>Modo simulado.</strong> Os registros de prova estão no modo simulado
            (BLOCKCHAIN_PROVIDER=simulated). O hash de prova é determinístico e sem rede externa.
            Nenhum dinheiro foi movimentado na blockchain.
          </span>
        </div>

        {/* Search */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, maxWidth: 600 }}>
          <input
            value={agreementId}
            onChange={(e) => setAgreementId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="ID do acordo (ex: cm…)"
            style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14, outline: 'none' }}
          />
          <button
            onClick={handleSearch}
            disabled={!agreementId.trim() || loading}
            style={{ padding: '10px 20px', borderRadius: 8, background: '#5B21B6', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Buscando…' : 'Buscar'}
          </button>
        </div>

        {error && (
          <div style={{ padding: '14px 18px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, color: '#991B1B', fontSize: 14, marginBottom: 20 }}>
            {error}
          </div>
        )}

        {searched && proofs.length === 0 && !error && (
          <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 14, background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB' }}>
            Nenhum registro de prova encontrado para este acordo.
          </div>
        )}

        {proofs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ color: '#6B7280', fontSize: 13, margin: '0 0 4px' }}>
              {proofs.length} registro{proofs.length !== 1 ? 's' : ''} de prova encontrado{proofs.length !== 1 ? 's' : ''}
            </p>
            {proofs.map((p) => (
              <div key={p.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                      {EVENT_LABEL[p.eventType ?? ''] ?? p.eventType ?? 'Evento desconhecido'}
                    </span>
                    <span style={{ marginLeft: 10, padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, color: STATUS_COLOR[p.status] ?? '#6B7280', background: (STATUS_COLOR[p.status] ?? '#6B7280') + '18' }}>
                      {p.status}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>{formatDate(p.createdAt)}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.3 }}>Hash de prova</div>
                    <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#374151', wordBreak: 'break-all' }}>
                      {p.proofHash ?? '—'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.3 }}>TxHash</div>
                    <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#374151' }}>
                      {p.txHash ? shortHash(p.txHash) : '—'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.3 }}>Rede · Provider</div>
                    <div style={{ fontSize: 12, color: '#374151' }}>{p.network} · {p.provider}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.3 }}>Submetido em</div>
                    <div style={{ fontSize: 12, color: '#374151' }}>{formatDate(p.submittedAt)}</div>
                  </div>
                </div>

                {p.errorMessage && (
                  <div style={{ marginTop: 12, padding: '8px 12px', background: '#FEF2F2', borderRadius: 6, fontSize: 12, color: '#991B1B' }}>
                    Erro: {p.errorMessage}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
