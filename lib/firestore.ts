import {
  doc,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Lease, PaymentRecord } from '../constants/demo';

function assertDb(db: unknown): asserts db is NonNullable<typeof db> {
  if (!db) throw new Error('Firestore not initialized');
}

// ---------------------------------------------------------------------------
// User profile
// ---------------------------------------------------------------------------

export async function createUserProfile(
  uid: string,
  displayName: string,
  email: string
): Promise<void> {
  assertDb(db);
  await setDoc(doc(db, `users/${uid}`), {
    displayName,
    email,
    createdAt: serverTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// Leases
// ---------------------------------------------------------------------------

export async function saveLease(uid: string, lease: Omit<Lease, 'id' | 'tenantId' | 'createdAt'>): Promise<string> {
  assertDb(db);
  const ref = await addDoc(collection(db, `users/${uid}/leases`), {
    ...lease,
    tenantId: uid,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateLease(uid: string, leaseId: string, updates: Partial<Lease>): Promise<void> {
  assertDb(db);
  await updateDoc(doc(db, `users/${uid}/leases/${leaseId}`), updates);
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export async function recordPayment(
  uid: string,
  payment: Omit<PaymentRecord, 'id' | 'createdAt'>
): Promise<string> {
  assertDb(db);
  const ref = await addDoc(collection(db, `users/${uid}/payments`), {
    ...payment,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// ---------------------------------------------------------------------------
// Reminder settings
// ---------------------------------------------------------------------------

export async function saveReminderSettings(
  uid: string,
  settings: { enabled: boolean; daysBeforeDue: number[] }
): Promise<void> {
  assertDb(db);
  await setDoc(doc(db, `users/${uid}/settings/reminders`), settings, { merge: true });
}
