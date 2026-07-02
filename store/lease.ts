import { create } from 'zustand';
import { IS_DEMO, DEMO_LEASE } from '../constants/demo';
import type { Lease } from '../constants/demo';

interface LeaseState {
  lease: Lease | null;
  setLease: (lease: Lease | null) => void;
  updateLease: (updates: Partial<Lease>) => void;
}

export const useLeaseStore = create<LeaseState>((set) => ({
  lease: IS_DEMO ? DEMO_LEASE : null,

  setLease: (lease) => set({ lease }),

  updateLease: (updates) =>
    set((s) => ({
      lease: s.lease ? { ...s.lease, ...updates } : null,
    })),
}));
