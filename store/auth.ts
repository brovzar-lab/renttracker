import { create } from 'zustand';

interface AuthState {
  uid: string | null;
  email: string | null;
  displayName: string | null;
  isAuthenticated: boolean;
  isPro: boolean;
  leaseId: string | null;

  setUser: (user: Partial<Omit<AuthState, 'setUser' | 'signOut'>>) => void;
  signOut: () => void;
}

const initialState: Omit<AuthState, 'setUser' | 'signOut'> = {
  uid: null,
  email: null,
  displayName: null,
  isAuthenticated: false,
  isPro: false,
  leaseId: null,
};

export const useAuthStore = create<AuthState>((set) => ({
  ...initialState,

  setUser: (user) => set((s) => ({ ...s, ...user })),

  signOut: () => set({ ...initialState }),
}));
