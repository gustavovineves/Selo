export interface AuthMeResponse {
  id: string;
  email: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  profile: {
    fullName: string;
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    city: string | null;
  } | null;
  trustScore: {
    score: number;
    level: TrustScoreLevel;
  } | null;
}

export type TrustScoreLevel =
  | 'VERY_LOW'
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'VERY_HIGH'
  | 'EXCELLENT';

export interface ReceivingKeyResponse {
  id: string;
  key: string;
  normalizedKey: string;
  type: string;
  status: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReceivingDestinationResponse {
  id: string;
  type: string;
  maskedValue: string;
  label: string;
  status: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AgreementOperationalStatus =
  | 'AWAITING_ACCEPTANCE'
  | 'ACTIVE'
  | 'AWAITING_CONFIRMATION'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

export type AgreementFinancialStatus =
  | 'NOT_APPLICABLE'
  | 'AWAITING_PAYMENT'
  | 'FUNDS_HELD'
  | 'AWAITING_PAYOUT'
  | 'PAID_OUT'
  | 'AWAITING_REFUND'
  | 'REFUNDED'
  | 'DISPUTED';

export type AgreementType = 'SIMPLE' | 'WITH_GUARANTEE';

export interface AgreementParticipant {
  id: string;
  userId: string;
  role: string;
  status: string;
  acceptedAt: string | null;
  rejectedAt: string | null;
  user: {
    id: string;
    profile: {
      fullName: string;
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  };
}

export interface AgreementSummaryItem {
  id: string;
  title: string;
  operationalStatus: AgreementOperationalStatus;
  financialStatus: AgreementFinancialStatus;
  type: AgreementType;
  amount: number | null;
  currency: string;
  dueDate: string | null;
  counterpartyName: string | null;
  counterpartyKey: string | null;
  myRole: string;
  isCreator: boolean;
  isPayer: boolean;
  isReceiver: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WalletSummary {
  user: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    trustScore: { score: number; level: TrustScoreLevel } | null;
  };
  receivingKey: { key: string; status: string } | null;
  totals: {
    activeAgreements: number;
    pendingMyAction: number;
    pendingOtherPartyAction: number;
    awaitingAcceptance: number;
    awaitingPayment: number;
    awaitingConfirmation: number;
    withGuarantee: number;
    inDispute: number;
    completed: number;
    cancelled: number;
    dueSoon: number;
  };
  financials: {
    amountsToReceive: { count: number; total: number; currency: string };
    amountsToPay: { count: number; total: number; currency: string };
    protectedAmounts: { count: number; total: number; currency: string };
  };
  sections: {
    pendingMyAction: AgreementSummaryItem[];
    amountsToReceive: AgreementSummaryItem[];
    amountsToPay: AgreementSummaryItem[];
    active: AgreementSummaryItem[];
    withGuarantee: AgreementSummaryItem[];
    inDispute: AgreementSummaryItem[];
    dueSoon: AgreementSummaryItem[];
    recent: AgreementSummaryItem[];
  };
}

export interface AgreementListItem {
  id: string;
  title: string;
  type: AgreementType;
  operationalStatus: AgreementOperationalStatus;
  financialStatus: AgreementFinancialStatus;
  amount: number | null;
  currency: string;
  dueDate: string | null;
  payerId: string | null;
  receiverId: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  participants: AgreementParticipant[];
  financialGuarantee: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    lockedAt: string | null;
  }>;
  dispute: Array<{
    id: string;
    status: string;
    reason: string;
    openedById: string;
  }>;
}

export interface AgreementsListResponse {
  data: AgreementListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
