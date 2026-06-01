import Constants from 'expo-constants';

const apiKey =
  Constants.expoConfig?.extra?.firebaseApiKey ??
  process.env.EXPO_PUBLIC_FIREBASE_API_KEY ??
  '';

export const IS_DEMO = !apiKey || apiKey === 'REPLACE_WITH_VALUE';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface HouseholdMember {
  uid: string;
  displayName: string;
  email: string;
  sharePercent: number;
  shareAmount: number;
  avatarUrl?: string | null;
}

export type PaymentMethod = 'venmo' | 'zelle' | 'cash' | 'check' | 'other';

export interface Payment {
  id: string;
  billId: string;
  memberId: string;
  amount: number;
  method: PaymentMethod;
  paidAt: string;
  note?: string;
}

export interface Bill {
  id: string;
  householdId: string;
  month: string; // YYYY-MM
  amount: number;
  dueDate: string;
  splitType: 'equal' | 'manual';
  createdAt: string;
}

export interface Household {
  id: string;
  name: string;
  rentAmount: number;
  dueDay: number;
  ownerId: string;
  memberIds: string[];
  inviteCode: string;
  createdAt: string;
}

// ─── Demo User ────────────────────────────────────────────────────────────────

export const DEMO_USER = {
  uid: 'demo-user-001',
  email: 'alex@example.com',
  displayName: 'Alex Chen',
  isPro: false,
  notificationsEnabled: true,
  reminderDays: [7, 3, 1],
};

// ─── Demo Household ───────────────────────────────────────────────────────────

export const DEMO_HOUSEHOLD: Household = {
  id: 'household-1',
  name: 'Oak Street Apartment',
  rentAmount: 3600,
  dueDay: 1,
  ownerId: 'demo-user-001',
  memberIds: ['demo-user-001', 'demo-user-002', 'demo-user-003'],
  inviteCode: 'OAKST42',
  createdAt: '2025-09-01T00:00:00Z',
};

// ─── Demo Members ─────────────────────────────────────────────────────────────

export const DEMO_MEMBERS: HouseholdMember[] = [
  {
    uid: 'demo-user-001',
    displayName: 'Alex Chen',
    email: 'alex@example.com',
    sharePercent: 40,
    shareAmount: 1440,
    avatarUrl: null,
  },
  {
    uid: 'demo-user-002',
    displayName: 'Jordan',
    email: 'jordan@example.com',
    sharePercent: 35,
    shareAmount: 1260,
    avatarUrl: null,
  },
  {
    uid: 'demo-user-003',
    displayName: 'Sam',
    email: 'sam@example.com',
    sharePercent: 25,
    shareAmount: 900,
    avatarUrl: null,
  },
];

// ─── Demo Bills ───────────────────────────────────────────────────────────────

export const DEMO_BILLS: Bill[] = [
  {
    id: 'bill-1',
    householdId: 'household-1',
    month: '2026-02',
    amount: 3600,
    dueDate: '2026-02-01',
    splitType: 'manual',
    createdAt: '2026-01-25T00:00:00Z',
  },
  {
    id: 'bill-2',
    householdId: 'household-1',
    month: '2026-03',
    amount: 3600,
    dueDate: '2026-03-01',
    splitType: 'manual',
    createdAt: '2026-02-22T00:00:00Z',
  },
  {
    id: 'bill-3',
    householdId: 'household-1',
    month: '2026-04',
    amount: 3600,
    dueDate: '2026-04-01',
    splitType: 'manual',
    createdAt: '2026-03-25T00:00:00Z',
  },
  {
    id: 'bill-4',
    householdId: 'household-1',
    month: '2026-05',
    amount: 3600,
    dueDate: '2026-05-01',
    splitType: 'manual',
    createdAt: '2026-04-25T00:00:00Z',
  },
  {
    id: 'bill-5',
    householdId: 'household-1',
    month: '2026-06',
    amount: 3600,
    dueDate: '2026-06-01',
    splitType: 'manual',
    createdAt: '2026-05-25T00:00:00Z',
  },
];

export const DEMO_CURRENT_BILL = DEMO_BILLS[DEMO_BILLS.length - 1];

// ─── Demo Payments ────────────────────────────────────────────────────────────
// 12 entries for Feb–May (all 3 members each month) + 1 entry for June (Alex only)
// Total: 13 payments

export const DEMO_PAYMENTS: Payment[] = [
  // February 2026
  { id: 'pay-1',  billId: 'bill-1', memberId: 'demo-user-001', amount: 1440, method: 'venmo', paidAt: '2026-02-01T10:00:00Z' },
  { id: 'pay-2',  billId: 'bill-1', memberId: 'demo-user-002', amount: 1260, method: 'zelle', paidAt: '2026-02-01T11:00:00Z' },
  { id: 'pay-3',  billId: 'bill-1', memberId: 'demo-user-003', amount:  900, method: 'venmo', paidAt: '2026-02-02T09:00:00Z' },
  // March 2026
  { id: 'pay-4',  billId: 'bill-2', memberId: 'demo-user-001', amount: 1440, method: 'venmo', paidAt: '2026-03-01T10:00:00Z' },
  { id: 'pay-5',  billId: 'bill-2', memberId: 'demo-user-002', amount: 1260, method: 'zelle', paidAt: '2026-03-01T12:00:00Z' },
  { id: 'pay-6',  billId: 'bill-2', memberId: 'demo-user-003', amount:  900, method: 'cash',  paidAt: '2026-03-02T08:30:00Z' },
  // April 2026
  { id: 'pay-7',  billId: 'bill-3', memberId: 'demo-user-001', amount: 1440, method: 'venmo', paidAt: '2026-04-01T10:00:00Z' },
  { id: 'pay-8',  billId: 'bill-3', memberId: 'demo-user-002', amount: 1260, method: 'zelle', paidAt: '2026-04-01T11:30:00Z' },
  { id: 'pay-9',  billId: 'bill-3', memberId: 'demo-user-003', amount:  900, method: 'venmo', paidAt: '2026-04-01T14:00:00Z' },
  // May 2026
  { id: 'pay-10', billId: 'bill-4', memberId: 'demo-user-001', amount: 1440, method: 'venmo', paidAt: '2026-05-01T09:00:00Z' },
  { id: 'pay-11', billId: 'bill-4', memberId: 'demo-user-002', amount: 1260, method: 'zelle', paidAt: '2026-05-01T10:00:00Z' },
  { id: 'pay-12', billId: 'bill-4', memberId: 'demo-user-003', amount:  900, method: 'venmo', paidAt: '2026-05-02T08:00:00Z' },
  // June 2026 — Alex only so far
  { id: 'pay-13', billId: 'bill-5', memberId: 'demo-user-001', amount: 1440, method: 'venmo', paidAt: '2026-06-01T09:30:00Z' },
];
