import { create } from 'zustand';
import {
  IS_DEMO,
  DEMO_HOUSEHOLD,
  DEMO_MEMBERS,
  DEMO_BILLS,
  DEMO_CURRENT_BILL,
} from '../constants/demo';

// Re-export shared types so consumers can import from a single store module
export type {
  Household,
  HouseholdMember,
  Bill,
  Payment,
  PaymentMethod,
} from '../constants/demo';

import type { Household, HouseholdMember, Bill } from '../constants/demo';

// ─── State shape ─────────────────────────────────────────────────────────────

interface HouseholdState {
  household: Household | null;
  members: HouseholdMember[];
  currentBill: Bill | null;
  bills: Bill[];

  // Setters
  setHousehold: (household: Household | null) => void;
  setMembers: (members: HouseholdMember[]) => void;
  setCurrentBill: (bill: Bill | null) => void;
  setBills: (bills: Bill[]) => void;

  // Actions
  updateRent: (rentAmount: number) => void;
  updateMemberShares: (shares: { uid: string; sharePercent: number; shareAmount: number }[]) => void;

  // Selectors
  getMyShare: (uid: string) => number;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useHouseholdStore = create<HouseholdState>((set, get) => ({
  household: IS_DEMO ? DEMO_HOUSEHOLD : null,
  members: IS_DEMO ? DEMO_MEMBERS : [],
  currentBill: IS_DEMO ? DEMO_CURRENT_BILL : null,
  bills: IS_DEMO ? DEMO_BILLS : [],

  // ── Setters ──────────────────────────────────────────────────────────────

  setHousehold: (household) => set({ household }),

  setMembers: (members) => set({ members }),

  setCurrentBill: (bill) => set({ currentBill: bill }),

  setBills: (bills) => set({ bills }),

  // ── Actions ──────────────────────────────────────────────────────────────

  updateRent: (rentAmount) =>
    set((s) => ({
      household: s.household ? { ...s.household, rentAmount } : null,
    })),

  updateMemberShares: (shares) =>
    set((s) => ({
      members: s.members.map((m) => {
        const update = shares.find((sh) => sh.uid === m.uid);
        return update ? { ...m, sharePercent: update.sharePercent, shareAmount: update.shareAmount } : m;
      }),
    })),

  // ── Selectors ────────────────────────────────────────────────────────────

  getMyShare: (uid) => {
    const member = get().members.find((m) => m.uid === uid);
    return member?.shareAmount ?? 0;
  },
}));
