export type AgreementStatus =
  | 'DRAFT'
  | 'PENDING_ACCEPTANCE'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'DISPUTED'
  | 'CANCELLED'
  | 'EXPIRED';

export type AgreementType = 'SIMPLE' | 'WITH_GUARANTEE';

export interface Agreement {
  id: string;
  title: string;
  description: string;
  type: AgreementType;
  status: AgreementStatus;
  creatorId: string;
  counterpartId?: string;
  counterpartEmail?: string;
  dueDate?: string;
  amount?: number;
  currency: string;
  proofHash?: string;
  blockchainTxId?: string;
  expiresAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgreementEvent {
  id: string;
  agreementId: string;
  actorId?: string;
  type: string;
  payload?: Record<string, unknown>;
  note?: string;
  createdAt: string;
}

export type DisputeStatus =
  | 'OPEN'
  | 'UNDER_REVIEW'
  | 'RESOLVED_FAVOR_CREATOR'
  | 'RESOLVED_FAVOR_COUNTERPART'
  | 'CLOSED';

export interface Dispute {
  id: string;
  agreementId: string;
  openedById: string;
  reason: string;
  description: string;
  status: DisputeStatus;
  resolution?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}
