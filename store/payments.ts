import { create } from 'zustand';
import { IS_DEMO, DEMO_PAYMENTS } from '../constants/demo';
import type { PaymentRecord, PaymentMethod } from '../constants/demo';

export type { PaymentRecord, PaymentMethod };

interface PaymentsState {
  payments: PaymentRecord[];
  setPayments: (payments: PaymentRecord[]) => void;
  addPayment: (payment: Omit<PaymentRecord, 'id' | 'createdAt'>) => PaymentRecord;
  hasPaymentForMonth: (month: string) => boolean;
}

export const usePaymentsStore = create<PaymentsState>((set, get) => ({
  payments: IS_DEMO ? DEMO_PAYMENTS : [],

  setPayments: (payments) => set({ payments }),

  addPayment: (payment) => {
    const ts = new Date().toISOString();
    const newPayment: PaymentRecord = {
      ...payment,
      id: 'pay-' + Date.now().toString(),
      createdAt: ts,
    };
    set((s) => ({ payments: [newPayment, ...s.payments] }));
    return newPayment;
  },

  hasPaymentForMonth: (month) =>
    get().payments.some((p) => p.month === month),
}));
