export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED';

export interface UserPublic {
  id: string;
  displayName: string;
  avatarUrl?: string;
  trustScore?: number;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  fullName: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  city?: string;
  state?: string;
}

export type ReceivingKeyType = 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM';

export interface ReceivingKey {
  id: string;
  userId: string;
  type: ReceivingKeyType;
  key: string;
  isDefault: boolean;
  active: boolean;
}
