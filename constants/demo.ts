import Constants from 'expo-constants';

const apiKey =
  Constants.expoConfig?.extra?.firebaseApiKey ??
  process.env.EXPO_PUBLIC_FIREBASE_API_KEY ??
  '';

export const IS_DEMO = !apiKey || apiKey === 'REPLACE_WITH_VALUE';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface Lease {
  id: string;
  tenantId: string;
  unit: string;
  address: string;
  monthlyRent: number;
  leaseStart: string;
  leaseEnd: string;
  dueDay: number;
  landlordName: string;
  landlordEmail: string;
  landlordInviteStatus: 'pending' | 'active';
  createdAt: string;
}

export type PaymentMethod = 'venmo' | 'zelle' | 'cash' | 'check' | 'other';
export type PaymentStatus = 'on_time' | 'late';

export interface PaymentRecord {
  id: string;
  leaseId: string;
  month: string;
  amount: number;
  paidDate: string;
  method: PaymentMethod;
  receiptUri?: string;
  status: PaymentStatus;
  createdAt: string;
}

export interface ReminderSettings {
  enabled: boolean;
  daysBeforeDue: number[];
}

// ─── Demo User — Jordan Martinez ───────────────────────────────────────────────

export const DEMO_USER = {
  uid: 'demo-tenant-001',
  email: 'jordan.martinez@example.com',
  displayName: 'Jordan Martinez',
  isPro: false,
  leaseId: 'lease-001',
};

// ─── Demo Lease ────────────────────────────────────────────────────────────────

export const DEMO_LEASE: Lease = {
  id: 'lease-001',
  tenantId: 'demo-tenant-001',
  unit: 'Apt 4B',
  address: '247 Elm Street, Apt 4B',
  monthlyRent: 850,
  leaseStart: '2026-01-01',
  leaseEnd: '2026-12-31',
  dueDay: 1,
  landlordName: 'Sarah Chen',
  landlordEmail: 'sarah.chen@properties.com',
  landlordInviteStatus: 'pending',
  createdAt: '2025-12-15T00:00:00Z',
};

// ─── Demo Payments (3 records visible in Payment Log) ─────────────────────────
// Apr & May have receipt thumbnails; Jun does not.

export const DEMO_PAYMENTS: PaymentRecord[] = [
  {
    id: 'pay-3',
    leaseId: 'lease-001',
    month: '2026-06',
    amount: 850,
    paidDate: '2026-06-01',
    method: 'venmo',
    receiptUri: undefined,
    status: 'on_time',
    createdAt: '2026-06-01T08:30:00Z',
  },
  {
    id: 'pay-2',
    leaseId: 'lease-001',
    month: '2026-05',
    amount: 850,
    paidDate: '2026-05-01',
    method: 'zelle',
    receiptUri: 'https://placehold.co/300x400/1e293b/10b981.png?text=Receipt+May',
    status: 'on_time',
    createdAt: '2026-05-01T10:00:00Z',
  },
  {
    id: 'pay-1',
    leaseId: 'lease-001',
    month: '2026-04',
    amount: 850,
    paidDate: '2026-04-01',
    method: 'zelle',
    receiptUri: 'https://placehold.co/300x400/1e293b/10b981.png?text=Receipt+Apr',
    status: 'on_time',
    createdAt: '2026-04-01T09:00:00Z',
  },
];

// ─── Demo Streak — 11 months on-time (Aug 2025 – Jun 2026) ───────────────────

export const DEMO_STREAK_MONTHS: string[] = [
  '2025-08', '2025-09', '2025-10', '2025-11', '2025-12',
  '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06',
];

export const DEMO_STREAK_COUNT = 11;

// ─── Demo Reminder Settings ────────────────────────────────────────────────────

export const DEMO_REMINDER_SETTINGS: ReminderSettings = {
  enabled: true,
  daysBeforeDue: [3],
};
