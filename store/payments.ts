import { create } from 'zustand';
import { DEMO_PAYMENTS, IS_DEMO } from '../constants/demo';
import type { Payment, PaymentMethod } from '../constants/demo';

export type { Payment, PaymentMethod };

interface PaymentsState {
  payments: Payment[];
  setPayments: (payments: Payment[]) => void;
  addPayment: (payment: Omit<Payment, 'id' | 'createdAt'>) => Payment;
  getPaymentsForBill: (billId: string) => Payment[];
  getPaymentsForUser: (userId: string) => Payment[];
  hasPaidBill: (userId: string, billId: string) => boolean;
}

export const usePaymentsStore = create<PaymentsState>((set, get) => ({
  payments: IS_DEMO ? DEMO_PAYMENTS : [],

  setPayments: (payments) => set({ payments }),

  addPayment: (payment) => {
    const ts = new Date().toISOString();
    const newPayment: Payment = {
      ...payment,
      id: 'pay-' + Date.now().toString(),
      createdAt: ts,
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
