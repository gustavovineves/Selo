// ── Shared admin types aligned with backend response shapes ──────────────────

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AdminLoginResponse {
  accessToken: string;
  expiresIn: string;
  admin: AdminUser;
}

export interface AdminMeResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  totalAgreements: number;
  totalDisputes: number;
  openDisputes: number;
  generatedAt: string;
}

export interface UserProfile {
  fullName: string | null;
  displayName: string | null;
  avatarUrl?: string | null;
}

export interface DisputeUser {
  id: string;
  profile: UserProfile | null;
}

// ── List types ────────────────────────────────────────────────────────────────

export interface GuaranteeSummary {
  id: string;
  status: string;
  amount: string;
  currency: string;
}

export interface AgreementSummary {
  id: string;
  title: string;
  amount: string | null;
  currency: string | null;
  operationalStatus: string;
  financialStatus: string;
  payerId: string | null;
  receiverId: string | null;
  createdAt: string;
  financialGuarantee: GuaranteeSummary | null;
  payer: DisputeUser | null;
  receiver: DisputeUser | null;
}

export interface DisputeListItem {
  id: string;
  status: string;
  openedById: string;
  reason: string;
  description: string | null;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
  openedBy: DisputeUser;
  agreement: AgreementSummary;
  messages: Array<{
    id: string;
    type: string;
    content: string;
    createdAt: string;
    senderType: string;
  }>;
  _count: { messages: number };
}

export interface DisputeListResponse {
  data: DisputeListItem[];
  total: number;
  page: number;
  limit: number;
}

// ── Detail types ──────────────────────────────────────────────────────────────

export interface AgreementParticipant {
  id: string;
  role: string;
  status: string;
  acceptedAt: string | null;
  user: DisputeUser;
}

export interface PixChargeDetail {
  id: string;
  txid: string;
  pixKey: string;
  qrCode: string;
  amount: string;
  status: string;
}

export interface PaymentIntentDetail {
  id: string;
  status: string;
  amount: string;
  currency: string;
  paidAt: string | null;
  pixCharge: PixChargeDetail | null;
}

export interface PayoutDetail {
  id: string;
  status: string;
  amount: string;
  currency: string;
  completedAt: string | null;
  metadata: Record<string, unknown> | null;
}

export interface RefundDetail {
  id: string;
  status: string;
  amount: string;
  currency: string;
  processedAt: string | null;
  reason: string;
  metadata: Record<string, unknown> | null;
}

export interface GuaranteeDetail {
  id: string;
  status: string;
  amount: string;
  currency: string;
  lockedAt: string | null;
  releasedAt: string | null;
  revertedAt: string | null;
  paymentIntents: PaymentIntentDetail[];
  payouts: PayoutDetail[];
  refunds: RefundDetail[];
}

export interface AgreementEvent {
  id: string;
  type: string;
  actorId: string | null;
  actorType: string;
  createdAt: string;
  payload: Record<string, unknown> | null;
}

export interface AgreementDetail {
  id: string;
  title: string;
  description: string | null;
  type: string;
  amount: string | null;
  currency: string | null;
  operationalStatus: string;
  financialStatus: string;
  createdAt: string;
  deadlineAt: string | null;
  payerId: string | null;
  receiverId: string | null;
  participants: AgreementParticipant[];
  financialGuarantee: GuaranteeDetail | null;
  events: AgreementEvent[];
  payer: DisputeUser | null;
  receiver: DisputeUser | null;
}

export interface DisputeMessage {
  id: string;
  disputeId: string;
  senderId: string | null;
  senderType: string;
  type: string;
  content: string;
  createdAt: string;
}

export interface DisputeDetail {
  id: string;
  agreementId: string;
  openedById: string;
  reason: string;
  description: string | null;
  status: string;
  resolution: string | null;
  resolvedById: string | null;
  resolvedByType: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  openedBy: DisputeUser;
  agreement: AgreementDetail;
  messages: DisputeMessage[];
}
