import {
  doc,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from './firebase';
import type { PaymentMethod } from '../constants/demo';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function assertDb(db: unknown): asserts db is NonNullable<typeof db> {
  if (!db) throw new Error('Firestore not initialized');
}

/** Generate a 6-character uppercase invite code from ownerId + timestamp. */
function generateInviteCode(ownerId: string): string {
  const ownerPart = ownerId.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 3).padEnd(3, 'X');
  const timePart = Date.now().toString(36).toUpperCase().slice(-3).padStart(3, '0');
  return `${ownerPart}${timePart}`;
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
    householdIds: [],
    notificationsEnabled: false,
    reminderDays: [3],
    createdAt: serverTimestamp(),
  });
}

export async function updateUserFcmToken(uid: string, fcmToken: string): Promise<void> {
  assertDb(db);
  await updateDoc(doc(db, `users/${uid}`), { fcmToken });
}

export async function updateUserReminderDays(uid: string, reminderDays: number[]): Promise<void> {
  assertDb(db);
  await updateDoc(doc(db, `users/${uid}`), { reminderDays });
}

// ---------------------------------------------------------------------------
// Households
// ---------------------------------------------------------------------------

export async function createHousehold(
  ownerId: string,
  name: string,
  rentAmount: number,
  dueDay: number
): Promise<string> {
  assertDb(db);
  const inviteCode = generateInviteCode(ownerId);
  const ref = await addDoc(collection(db, 'households'), {
    name,
    rentAmount,
    dueDay,
    ownerId,
    memberIds: [ownerId],
    inviteCode,
    createdAt: serverTimestamp(),
  });
  // Link household to owner's profile
  await updateDoc(doc(db, `users/${ownerId}`), {
    householdIds: arrayUnion(ref.id),
  });
  return ref.id;
}

export async function joinHousehold(uid: string, inviteCode: string): Promise<string> {
  assertDb(db);
  const q = query(collection(db, 'households'), where('inviteCode', '==', inviteCode));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error('Invalid invite code');
  const householdDoc = snap.docs[0];
  const hid = householdDoc.id;
  await updateDoc(doc(db, `households/${hid}`), {
    memberIds: arrayUnion(uid),
  });
  await updateDoc(doc(db, `users/${uid}`), {
    householdIds: arrayUnion(hid),
  });
  return hid;
}

export async function updateHouseholdRent(
  hid: string,
  rentAmount: number,
  dueDay: number
): Promise<void> {
  assertDb(db);
  await updateDoc(doc(db, `households/${hid}`), { rentAmount, dueDay });
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export async function setMemberShare(
  hid: string,
  uid: string,
  displayName: string,
  email: string,
  sharePercent: number,
  shareAmount: number
): Promise<void> {
  assertDb(db);
  await setDoc(doc(db, `households/${hid}/members/${uid}`), {
    displayName,
    email,
    sharePercent,
    shareAmount,
  });
}

export async function removeMember(hid: string, uid: string): Promise<void> {
  assertDb(db);
  await deleteDoc(doc(db, `households/${hid}/members/${uid}`));
  await updateDoc(doc(db, `households/${hid}`), {
    memberIds: arrayRemove(uid),
  });
  await updateDoc(doc(db, `users/${uid}`), {
    householdIds: arrayRemove(hid),
  });
}

// ---------------------------------------------------------------------------
// Bills
// ---------------------------------------------------------------------------

export interface BillInput {
  label: string;
  amount: number;
  dueDate: string;
  splitType: 'equal' | 'percent' | 'fixed';
}

export async function createBill(hid: string, bill: BillInput): Promise<string> {
  assertDb(db);
  const ref = await addDoc(collection(db, `households/${hid}/bills`), {
    ...bill,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export interface PaymentInput {
  fromUserId: string;
  fromDisplayName: string;
  amount: number;
  confirmedAt: string;
  billId: string;
  method: PaymentMethod;
}

export async function recordPayment(hid: string, payment: PaymentInput): Promise<string> {
  assertDb(db);
  const ref = await addDoc(collection(db, `households/${hid}/payments`), {
    ...payment,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}
