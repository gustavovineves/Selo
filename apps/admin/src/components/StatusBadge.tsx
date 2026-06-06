// ── Status badge component ────────────────────────────────────────────────────

type Config = { label: string; color: string; bg: string };

const DISPUTE_STATUS: Record<string, Config> = {
  OPEN:                       { label: 'Aberta',                    color: '#92400E', bg: '#FEF3C7' },
  UNDER_REVIEW:               { label: 'Em análise',                color: '#1D4ED8', bg: '#EFF6FF' },
  AWAITING_EVIDENCE:          { label: 'Aguardando evidências',     color: '#6D28D9', bg: '#EDE9FE' },
  RESOLVED_FAVOR_CREATOR:     { label: 'Reembolsado ao pagador',    color: '#065F46', bg: '#D1FAE5' },
  RESOLVED_FAVOR_COUNTERPART: { label: 'Liberado ao recebedor',     color: '#065F46', bg: '#D1FAE5' },
  WITHDRAWN:                  { label: 'Retirada',                  color: '#374151', bg: '#F3F4F6' },
  CLOSED:                     { label: 'Encerrada',                 color: '#374151', bg: '#F3F4F6' },
};

const FINANCIAL_STATUS: Record<string, Config> = {
  NOT_APPLICABLE:  { label: 'Sem garantia',            color: '#374151', bg: '#F3F4F6' },
  AWAITING_PAYMENT:{ label: 'Aguardando pagamento',    color: '#92400E', bg: '#FEF3C7' },
  FUNDS_HELD:      { label: 'Valor protegido',          color: '#065F46', bg: '#D1FAE5' },
  DISPUTED:        { label: 'Em contestação',           color: '#991B1B', bg: '#FEE2E2' },
  PAID_OUT:        { label: 'Liberado ao recebedor',   color: '#065F46', bg: '#D1FAE5' },
  REFUNDED:        { label: 'Reembolsado',             color: '#065F46', bg: '#D1FAE5' },
};

const GUARANTEE_STATUS: Record<string, Config> = {
  AWAITING_PAYMENT: { label: 'Aguardando depósito',          color: '#92400E', bg: '#FEF3C7' },
  FUNDS_HELD:       { label: 'Valor protegido',              color: '#065F46', bg: '#D1FAE5' },
  LOCKED:           { label: 'Valor travado',                color: '#065F46', bg: '#D1FAE5' },
  FROZEN_DISPUTE:   { label: 'Travado — Em contestação',     color: '#991B1B', bg: '#FEE2E2' },
  PAID_OUT:         { label: 'Liberado ao recebedor',        color: '#065F46', bg: '#D1FAE5' },
  REFUNDED:         { label: 'Reembolsado ao pagador',       color: '#065F46', bg: '#D1FAE5' },
  CANCELLED:        { label: 'Cancelado',                    color: '#374151', bg: '#F3F4F6' },
  EXPIRED:          { label: 'Vencido',                      color: '#991B1B', bg: '#FEE2E2' },
};

const OPERATIONAL_STATUS: Record<string, Config> = {
  DRAFT:                  { label: 'Rascunho',                color: '#374151', bg: '#F3F4F6' },
  AWAITING_ACCEPTANCE:    { label: 'Aguardando aceite',       color: '#92400E', bg: '#FEF3C7' },
  ACTIVE:                 { label: 'Ativo',                   color: '#065F46', bg: '#D1FAE5' },
  AWAITING_CONFIRMATION:  { label: 'Aguardando confirmação',  color: '#1D4ED8', bg: '#EFF6FF' },
  COMPLETED:              { label: 'Concluído',               color: '#065F46', bg: '#D1FAE5' },
  CANCELLED:              { label: 'Cancelado',               color: '#374151', bg: '#F3F4F6' },
  EXPIRED:                { label: 'Vencido',                 color: '#991B1B', bg: '#FEE2E2' },
};

type BadgeType = 'dispute' | 'financial' | 'guarantee' | 'operational';

const STATUS_MAPS: Record<BadgeType, Record<string, Config>> = {
  dispute:     DISPUTE_STATUS,
  financial:   FINANCIAL_STATUS,
  guarantee:   GUARANTEE_STATUS,
  operational: OPERATIONAL_STATUS,
};

const FALLBACK: Config = { label: '—', color: '#374151', bg: '#F3F4F6' };

interface StatusBadgeProps {
  status: string;
  type: BadgeType;
}

export function StatusBadge({ status, type }: StatusBadgeProps) {
  const config = STATUS_MAPS[type][status] ?? { ...FALLBACK, label: status };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        color: config.color,
        backgroundColor: config.bg,
        letterSpacing: 0.2,
        whiteSpace: 'nowrap',
      }}
    >
      {config.label}
    </span>
  );
}
