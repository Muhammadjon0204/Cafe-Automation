import { apiClient } from '@cafe/shared';

export interface Payment {
  id: number;
  orderId: number;
  orderNumber: string;
  cashierId: number | null;
  cashierName: string | null;
  amount: number;
  method: number;
  status: number;
  paidAt: string;
  transactionNumber: string | null;
  note: string | null;
}

export interface CreatePaymentValues {
  orderId: number;
  amount: number;
  method: number;
  transactionNumber?: string;
  note?: string;
}

export function getPaymentsByOrder(orderId: number): Promise<Payment[]> {
  return apiClient.get<Payment[]>(`/payments/by-order/${orderId}`);
}

// Every created Payment is immediately Status=Paid server-side (PaymentService.CreateAsync) -
// there's no separate "pending transaction" step to model here. The backend recomputes the
// order's aggregate PaymentStatus (Unpaid/PartiallyPaid/Paid) from the sum of all payments vs
// order.TotalAmount and rejects an amount that would overpay it.
export function createPayment(values: CreatePaymentValues): Promise<Payment> {
  return apiClient.post<Payment>('/payments', values);
}
