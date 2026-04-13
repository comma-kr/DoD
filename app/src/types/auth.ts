export interface OtpRecord {
  phone: string;
  code: string;
  expiresAt: string;
  attempts: number;
  createdAt: string;
}

export interface FreeQuota {
  phone: string;
  usedAt?: string;
  usedApartmentId?: string;
  resetCount: number;
  createdAt: string;
}

export interface AuthSession {
  phone: string;
  verifiedAt: string;
}
