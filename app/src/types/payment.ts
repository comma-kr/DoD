import type { ProductId } from '@/lib/pricing';

export type PaymentStatus = 'pending' | 'approved' | 'failed' | 'cancelled';

export interface Payment {
  id: string;
  userId?: string;
  phone: string;
  reportId?: string;
  orderId: string;
  paymentKey?: string;
  productId: ProductId;
  amount: number;
  status: PaymentStatus;
  method?: 'card' | 'kakaopay' | 'naverpay' | string;
  approvedAt?: string;
  createdAt: string;
}

export interface TossConfirmRequest {
  paymentKey: string;
  orderId: string;
  amount: number;
  productId: ProductId;
}
