'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminLayout } from '@/components/AdminLayout';
import { Modal } from '@/components/Modal';
import { StatusBadge } from '@/components/StatusBadge';
import { apiRequest, isAuthenticated } from '@/lib/api';
import type { DisputeDetail, DisputeMessage } from '@/lib/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function shortId(id: string): string {
  return id.slice(-8).toUpperCase();
}

function evidenceTypeLabel(type: string): string {
  const map: Record<string, string> = {
    TEXT:        'Texto',
    EVIDENCE:    'Evidência formal',
    SYSTEM_NOTE: 'Nota do sistema',
    ADMIN_NOTE:  'Nota administrativa',
    RESOLUTION:  'Decisão administrativa',
  };
  return map[type] ?? type;
}

function evidenceTypeStyle(type: string): { color: string; bg: string } {
  const map: Record<string, { color: string; bg: string }> = {
    EVIDENCE:    { color: '#1D4ED8', bg: '#EFF6FF' },
    RESOLUTION:  { color: '#065F46', bg: '#D1FAE5' },
    SYSTEM_NOTE: { color: '#374151', bg: '#F3F4F6' },
    ADMIN_NOTE:  { color: '#6D28D9', bg: '#EDE9FE' },
    TEXT:        { color: '#374151', bg: '#F3F4F6' },
  };
  return map[type] ?? { color: '#374151', bg: '#F3F4F6' };
}

function eventLabel(type: string): string {
  const map: Record<string, string> = {
    CREATED:                'Acordo criado',
    SENT:                   'Enviado à contraparte',
    ACCEPTED:               'Aceito pela contraparte',
    REJECTED:               'Recusado',
    CANCELLED:              'Cancelado',
    COMPLETED:              'Concluído',
    CONFIRMED:              'Confirmação de conclusão registrada',
    CONFIRMATION_REQUESTED: 'Confirmação solicitada à outra parte',
    PAYMENT_REQUESTED:      'Depósito Pix solicitado',
    FUNDS_LOCKED:           'Depósito confirmado — valor protegido',
    PAYOUT_INITIATED:       'Liberação do valor iniciada',
    PAYOUT_COMPLETED:       'Valor liberado ao recebedor',
    REFUND_INITIATED:       'Reembolso iniciado',
    REFUND_COMPLETED:       'Reembolso concluído',
    DISPUTE_OPENED:         'Contestação aberta',
    DISPUTE_RESOLVED:       'Contestação resolvida administrativamente',
    EXPIRED:                'Acordo vencido',
  };
  return map[type] ?? type;
}

// ── Layout helpers ────────────────────────────────────────────────────────────

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        border: '1px solid #E5E7EB',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        marginBottom: 16,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '14px 20px',
          borderBottom: '1px solid #F3F4F6',
          background: '#F9FAFB',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 11,
            fontWeight: 700,
            color: '#6B7280',
            textTransform: 'uppercase',
            letterSpacing: 0.8,
          }}
        >
          {title}
        </h2>
      </div>
      <div style={{ padding: '8px 0' }}>{children}</div>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 16,
        padding: '10px 20px',
        borderBottom: '1px solid #F9FAFB',
        alignItems: 'flex-start',
      }}
    >
      <div
        style={{
          width: 200,
          flexShrink: 0,
          fontSize: 13,
          color: '#6B7280',
          fontWeight: 500,
          paddingTop: 1,
        }}
      >
        {label}
      </div>
      <div style={{ flex: 1, fontSize: 14, color: '#111827', lineHeight: 1.5 }}>
        {value ?? <span style={{ color: '#9CA3AF' }}>—</span>}
      </div>
    </div>
  );
}

// ── Action Modal ──────────────────────────────────────────────────────────────

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  title: string;
  subtitle: string;
  confirmLabel: string;
  confirmColor: string;
}

function ActionModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  subtitle,
  confirmLabel,
  confirmColor,
}: ActionModalProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setReason('');
      setModalError('');
    }
  }, [isOpen]);

  const reasonTrimmed = reason.trim();
  const isValid = reasonTrimmed.length >= 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      setModalError('A justificativa deve ter pelo menos 10 caracteres.');
      return;
    }
    setSubmitting(true);
    setModalError('');
    try {
      await onConfirm(reasonTrimmed);
      onClose();
    } catch (e: unknown) {
      setModalError(
        e instanceof Error ? e.message : 'Ocorreu um erro. Tente novamente.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} subtitle={subtitle}>
      <form onSubmit={handleSubmit}>
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
            Justificativa da decisão{' '}
            <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Descreva o motivo da decisão administrativa. Mínimo de 10 caracteres."
            rows={5}
            style={{
              width: '100%',
              padding: 12,
              border: `1.5px solid ${modalError ? '#EF4444' : '#D1D5DB'}`,
              borderRadius: 8,
              fontSize: 14,
              resize: 'vertical',
              boxSizing: 'border-box',
              color: '#111827',
              outline: 'none',
            }}
          />
          <div
            style={{
              fontSize: 12,
              color: isValid ? '#059669' : '#9CA3AF',
              marginTop: 4,
            }}
          >
            {reasonTrimmed.length} / mínimo 10 caracteres
          </div>
        </div>

        {modalError && (
          <div
            style={{
              padding: '10px 14px',
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: 8,
              color: '#991B1B',
              fontSize: 13,
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            {modalError}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            gap: 10,
            justifyContent: 'flex-end',
            paddingTop: 8,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: '1px solid #D1D5DB',
              background: '#fff',
              color: '#374151',
              fontSize: 14,
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting || !isValid}
            style={{
              padding: '10px 22px',
              borderRadius: 8,
              border: 'none',
              background: submitting || !isValid ? '#9CA3AF' : confirmColor,
              color: '#fff',
              fontSize: 14,
              cursor: submitting || !isValid ? 'not-allowed' : 'pointer',
              fontWeight: 700,
            }}
          >
            {submitting ? 'Processando...' : confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DisputeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [dispute, setDispute] = useState<DisputeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [releaseModal, setReleaseModal] = useState(false);
  const [refundModal, setRefundModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const d = await apiRequest<DisputeDetail>(`/admin/disputes/${id}`);
      setDispute(d);
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : 'Não foi possível carregar a contestação.',
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }
    load();
  }, [router, load]);

  const handleRelease = async (reason: string) => {
    await apiRequest(`/admin/disputes/${id}/resolve-release`, {
      method: 'POST',
      body: { reason },
    });
    setSuccessMessage(
      'Decisão registrada: valor liberado ao recebedor. Contestação encerrada.',
    );
    await load();
  };

  const handleRefund = async (reason: string) => {
    await apiRequest(`/admin/disputes/${id}/resolve-refund`, {
      method: 'POST',
      body: { reason },
    });
    setSuccessMessage(
      'Decisão registrada: reembolso ao pagador. Contestação encerrada.',
    );
    await load();
  };

  // ── Loading / Error states ──────────────────────────────────────────────────

  if (loading) {
    return (
      <AdminLayout>
        <div style={{ padding: 32, color: '#6B7280', fontSize: 15 }}>
          Carregando contestação...
        </div>
      </AdminLayout>
    );
  }

  if (error || !dispute) {
    return (
      <AdminLayout>
        <div style={{ padding: 32 }}>
          <div
            style={{
              padding: '14px 18px',
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: 10,
              color: '#991B1B',
              fontSize: 14,
              marginBottom: 16,
            }}
          >
            {error || 'Contestação não encontrada.'}
          </div>
          <Link
            href="/disputes"
            style={{ color: '#5B21B6', textDecoration: 'none', fontSize: 14 }}
          >
            ← Voltar para contestações
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const agreement = dispute.agreement;
  const guarantee = agreement.financialGuarantee;
  const isOpen = dispute.status === 'OPEN';

  return (
    <AdminLayout>
      <div style={{ padding: 32, maxWidth: 920 }}>
        {/* Breadcrumb */}
        <div
          style={{
            marginBottom: 22,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 14,
            color: '#6B7280',
          }}
        >
          <Link
            href="/disputes"
            style={{ color: '#5B21B6', textDecoration: 'none', fontWeight: 500 }}
          >
            Contestações
          </Link>
          <span>›</span>
          <span style={{ color: '#111827', fontWeight: 600 }}>
            #{shortId(dispute.id)}
          </span>
        </div>

        {/* Page header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 24,
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 6,
              }}
            >
              <h1
                style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 }}
              >
                Contestação
              </h1>
              <StatusBadge status={dispute.status} type="dispute" />
            </div>
            <code
              style={{
                fontSize: 12,
                color: '#9CA3AF',
                fontFamily: 'monospace',
              }}
            >
              {dispute.id}
            </code>
          </div>

          {/* Action buttons — only when OPEN */}
          {isOpen && (
            <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
              <button
                onClick={() => setRefundModal(true)}
                style={{
                  padding: '11px 20px',
                  borderRadius: 8,
                  border: '2px solid #D97706',
                  background: '#fff',
                  color: '#D97706',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Reembolsar pagador
              </button>
              <button
                onClick={() => setReleaseModal(true)}
                style={{
                  padding: '11px 20px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#059669',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Liberar ao recebedor
              </button>
            </div>
          )}
        </div>

        {/* Success banner */}
        {successMessage && (
          <div
            style={{
              padding: '14px 18px',
              background: '#D1FAE5',
              border: '1px solid #6EE7B7',
              borderRadius: 10,
              color: '#065F46',
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 20,
            }}
          >
            ✓ {successMessage}
          </div>
        )}

        {/* ── Bloco 1: Resumo da contestação ── */}
        <SectionCard title="Resumo da contestação">
          <InfoRow
            label="Status"
            value={<StatusBadge status={dispute.status} type="dispute" />}
          />
          <InfoRow label="Aberta em" value={formatDate(dispute.createdAt)} />
          <InfoRow label="Aberta por" value={getName(dispute.openedBy)} />
          <InfoRow label="Motivo" value={dispute.reason} />
          {dispute.description && (
            <InfoRow
              label="Descrição"
              value={
                <span style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {dispute.description}
                </span>
              }
            />
          )}
          {dispute.resolution && (
            <>
              <InfoRow
                label="Decisão registrada"
                value={
                  <span style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                    {dispute.resolution}
                  </span>
                }
              />
              {dispute.resolvedAt && (
                <InfoRow
                  label="Resolvida em"
                  value={formatDate(dispute.resolvedAt)}
                />
              )}
              <InfoRow
                label="Resolvida por"
                value={
                  dispute.resolvedByType === 'ADMIN'
                    ? 'Administrador'
                    : (dispute.resolvedByType ?? '—')
                }
              />
            </>
          )}
        </SectionCard>

        {/* ── Bloco 2: Acordo relacionado ── */}
        <SectionCard title="Acordo relacionado">
          <InfoRow
            label="Título"
            value={<strong>{agreement.title}</strong>}
          />
          {agreement.description && (
            <InfoRow label="Descrição" value={agreement.description} />
          )}
          <InfoRow
            label="Tipo"
            value={
              agreement.type === 'WITH_GUARANTEE'
                ? 'Com garantia financeira'
                : 'Simples'
            }
          />
          <InfoRow
            label="Status operacional"
            value={
              <StatusBadge
                status={agreement.operationalStatus}
                type="operational"
              />
            }
          />
          <InfoRow
            label="Status financeiro"
            value={
              <StatusBadge status={agreement.financialStatus} type="financial" />
            }
          />
          <InfoRow
            label="Valor do acordo"
            value={formatAmount(agreement.amount, agreement.currency)}
          />
          <InfoRow label="Criado em" value={formatDate(agreement.createdAt)} />
          {agreement.deadlineAt && (
            <InfoRow label="Prazo" value={formatDate(agreement.deadlineAt)} />
          )}
          <InfoRow
            label="ID do acordo"
            value={
              <code
                style={{
                  fontFamily: 'monospace',
                  fontSize: 12,
                  color: '#6B7280',
                }}
              >
                {agreement.id}
              </code>
            }
          />
        </SectionCard>

        {/* ── Bloco 3: Participantes ── */}
        <SectionCard title="Participantes">
          <InfoRow
            label="Pagador"
            value={
              <span>
                <strong>{getName(agreement.payer)}</strong>
                {agreement.payerId && (
                  <code
                    style={{
                      marginLeft: 8,
                      fontSize: 11,
                      color: '#9CA3AF',
                      fontFamily: 'monospace',
                      background: '#F3F4F6',
                      padding: '1px 5px',
                      borderRadius: 3,
                    }}
                  >
                    ...{agreement.payerId.slice(-8)}
                  </code>
                )}
              </span>
            }
          />
          <InfoRow
            label="Recebedor"
            value={
              <span>
                <strong>{getName(agreement.receiver)}</strong>
                {agreement.receiverId && (
                  <code
                    style={{
                      marginLeft: 8,
                      fontSize: 11,
                      color: '#9CA3AF',
                      fontFamily: 'monospace',
                      background: '#F3F4F6',
                      padding: '1px 5px',
                      borderRadius: 3,
                    }}
                  >
                    ...{agreement.receiverId.slice(-8)}
                  </code>
                )}
              </span>
            }
          />
          {agreement.participants.map((p) => (
            <InfoRow
              key={p.id}
              label={`Participante (${p.role})`}
              value={
                <span>
                  {getName(p.user)}
                  <span style={{ marginLeft: 10, fontSize: 12, color: '#6B7280' }}>
                    —{' '}
                    {p.status === 'ACCEPTED'
                      ? 'Aceitou'
                      : p.status === 'REJECTED'
                      ? 'Recusou'
                      : p.status}
                    {p.acceptedAt ? ` em ${formatDate(p.acceptedAt)}` : ''}
                  </span>
                </span>
              }
            />
          ))}
        </SectionCard>

        {/* ── Bloco 4: Valor protegido ── */}
        {guarantee && (
          <SectionCard title="Valor protegido">
            <InfoRow
              label="Status da garantia"
              value={<StatusBadge status={guarantee.status} type="guarantee" />}
            />
            <InfoRow
              label="Valor protegido"
              value={formatAmount(guarantee.amount, guarantee.currency)}
            />
            <InfoRow
              label="Travado por contestação"
              value={
                guarantee.status === 'FROZEN_DISPUTE'
                  ? 'Sim — aguardando decisão administrativa'
                  : 'Não'
              }
            />
            {guarantee.releasedAt && (
              <InfoRow
                label="Liberado em"
                value={formatDate(guarantee.releasedAt)}
              />
            )}
            {guarantee.revertedAt && (
              <InfoRow
                label="Reembolsado em"
                value={formatDate(guarantee.revertedAt)}
              />
            )}

            {/* Payouts */}
            {guarantee.payouts.length > 0 && (
              <div style={{ padding: '10px 20px' }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#6B7280',
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                    marginBottom: 8,
                  }}
                >
                  Liberações registradas
                </div>
                {guarantee.payouts.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      padding: '8px 12px',
                      background: '#F0FDF4',
                      borderRadius: 7,
                      marginBottom: 6,
                      fontSize: 13,
                      color: '#065F46',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>
                      {formatAmount(p.amount, p.currency)}
                      {(p.metadata as { simulated?: boolean })?.simulated && (
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: 11,
                            color: '#059669',
                            fontStyle: 'italic',
                          }}
                        >
                          (simulado)
                        </span>
                      )}
                    </span>
                    <span style={{ color: '#6B7280', fontSize: 12 }}>
                      {p.completedAt ? formatDate(p.completedAt) : 'Pendente'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Refunds */}
            {guarantee.refunds.length > 0 && (
              <div style={{ padding: '10px 20px' }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#6B7280',
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                    marginBottom: 8,
                  }}
                >
                  Reembolsos registrados
                </div>
                {guarantee.refunds.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      padding: '8px 12px',
                      background: '#FFFBEB',
                      borderRadius: 7,
                      marginBottom: 6,
                      fontSize: 13,
                      color: '#92400E',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>
                      {formatAmount(r.amount, r.currency)}
                      {(r.metadata as { simulated?: boolean })?.simulated && (
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: 11,
                            color: '#D97706',
                            fontStyle: 'italic',
                          }}
                        >
                          (simulado)
                        </span>
                      )}
                    </span>
                    <span style={{ color: '#6B7280', fontSize: 12 }}>
                      {r.processedAt ? formatDate(r.processedAt) : 'Pendente'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        )}

        {/* ── Bloco 5: Evidências e registros formais ── */}
        <SectionCard title="Evidências e registros formais">
          {dispute.messages.length === 0 ? (
            <div style={{ padding: '16px 20px', color: '#9CA3AF', fontSize: 14 }}>
              Nenhum registro formal submetido pelas partes.
            </div>
          ) : (
            <div style={{ padding: '8px 0' }}>
              {dispute.messages.map((m: DisputeMessage, idx: number) => {
                const ts = evidenceTypeStyle(m.type);
                return (
                  <div
                    key={m.id}
                    style={{
                      padding: '14px 20px',
                      borderBottom:
                        idx < dispute.messages.length - 1
                          ? '1px solid #F3F4F6'
                          : 'none',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 8,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span
                        style={{
                          padding: '2px 9px',
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 700,
                          color: ts.color,
                          background: ts.bg,
                          letterSpacing: 0.3,
                        }}
                      >
                        {evidenceTypeLabel(m.type)}
                      </span>
                      <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                        {m.senderType === 'SYSTEM'
                          ? 'Sistema'
                          : `Usuário ${m.senderId?.slice(-6) ?? '—'}`}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: '#9CA3AF',
                          marginLeft: 'auto',
                        }}
                      >
                        {formatDate(m.createdAt)}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        color: '#374151',
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.65,
                        background: '#F9FAFB',
                        padding: '10px 14px',
                        borderRadius: 7,
                        border: '1px solid #F3F4F6',
                      }}
                    >
                      {m.content}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* ── Bloco 6: Histórico de eventos ── */}
        <SectionCard title="Histórico de eventos do acordo">
          {agreement.events.length === 0 ? (
            <div style={{ padding: '16px 20px', color: '#9CA3AF', fontSize: 14 }}>
              Nenhum evento registrado.
            </div>
          ) : (
            <div style={{ padding: '12px 20px' }}>
              {agreement.events.map((ev, idx) => (
                <div
                  key={ev.id}
                  style={{ display: 'flex', gap: 14, marginBottom: 14 }}
                >
                  {/* Timeline dot */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      flexShrink: 0,
                      width: 16,
                    }}
                  >
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background:
                          ev.type === 'DISPUTE_RESOLVED'
                            ? '#059669'
                            : ev.type === 'DISPUTE_OPENED'
                            ? '#EF4444'
                            : '#5B21B6',
                        flexShrink: 0,
                        marginTop: 4,
                      }}
                    />
                    {idx < agreement.events.length - 1 && (
                      <div
                        style={{
                          width: 1,
                          flex: 1,
                          background: '#E5E7EB',
                          minHeight: 18,
                          marginTop: 4,
                        }}
                      />
                    )}
                  </div>
                  {/* Event info */}
                  <div style={{ flex: 1, paddingBottom: idx < agreement.events.length - 1 ? 0 : 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#374151',
                        marginBottom: 2,
                      }}
                    >
                      {eventLabel(ev.type)}
                    </div>
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                      {formatDate(ev.createdAt)}
                      {ev.actorType && (
                        <span style={{ marginLeft: 8 }}>
                          —{' '}
                          {ev.actorType === 'ADMIN'
                            ? 'Administrador'
                            : ev.actorType === 'USER'
                            ? 'Usuário'
                            : ev.actorType}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── Modais de ação ── */}
      <ActionModal
        isOpen={releaseModal}
        onClose={() => setReleaseModal(false)}
        onConfirm={handleRelease}
        title="Liberar valor ao recebedor?"
        subtitle="Essa decisão encerrará a contestação e marcará o valor como liberado ao recebedor. A ação é irreversível."
        confirmLabel="Confirmar liberação"
        confirmColor="#059669"
      />
      <ActionModal
        isOpen={refundModal}
        onClose={() => setRefundModal(false)}
        onConfirm={handleRefund}
        title="Reembolsar pagador?"
        subtitle="Essa decisão encerrará a contestação e marcará o valor como reembolsado ao pagador. A ação é irreversível."
        confirmLabel="Confirmar reembolso"
        confirmColor="#D97706"
      />
    </AdminLayout>
  );
}
