import { create } from 'zustand';
import { DEMO_PAYMENTS, IS_DEMO } from '../constants/demo';

export type { PaymentMethod } from '../constants/demo';

export interface Payment {
  id: string;
  fromUserId: string;
  fromDisplayName: string;
  amount: number;
  confirmedAt: string;
  billId: string;
  method: import('../constants/demo').PaymentMethod;
  createdAt: string;
}

interface PaymentsState {
  payments: Payment[];
  setPayments: (payments: Payment[]) => void;
  addPayment: (payment: Omit<Payment, 'id' | 'createdAt'>) => Payment;
  getPaymentsForBill: (billId: string) => Payment[];
  getPaymentsForUser: (userId: string) => Payment[];
  hasPaidBill: (userId: string, billId: string) => boolean;
}

export const usePaymentsStore = create<PaymentsState>((set, get) => ({
  payments: IS_DEMO ? (DEMO_PAYMENTS as unknown as Payment[]) : [],

  setPayments: (payments) => set({ payments }),

  addPayment: (payment) => {
    const newPayment: Payment = {
      ...payment,
      id: `pay-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ payments: [newPayment, ...s.payments] }));
    return newPayment;
  },

  getPaymentsForBill: (billId) =>
    get().payments.filter((p) => p.billId === billId),

  getPaymentsForUser: (userId) =>
    get().payments.filter((p) => p.fromUserId === userId),

  hasPaidBill: (userId, billId) =>
    get().payments.some((p) => p.fromUserId === userId && p.billId === billId),
}));
