import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import PDFDocument from 'pdfkit';
import { randomUUID } from 'crypto';
import nodemailer from 'nodemailer';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const storage = admin.storage();

// ── Interfaces ─────────────────────────────────────────────────────────────────

interface UserDoc {
  householdIds: string[];
  tier?: 'free' | 'pro';
  pushToken?: string;
  reminderDays?: number[];
}

interface HouseholdDoc {
  dueDay: number;
  rentAmount: number;
}

interface BillDoc {
  label: string;
  amount: number;
  dueDate: admin.firestore.Timestamp;
  splitType: string;
}

interface LeaseDoc {
  userId: string;
  address: string;
  landlordName: string;
  monthlyRent: number;
  dueDay: number;
  leaseEnd?: string | null;
}

interface LeasePaymentDoc {
  amount: number;
  method: string;
  confirmedAt: admin.firestore.Timestamp | string;
  receiptStoragePath?: string;
}

interface GenerateExportData {
  leaseId: string;
  dateRange: { from: string; to: string };
}

interface SendLandlordInviteData {
  leaseId: string;
  landlordEmail: string;
  landlordName: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function toDate(value: admin.firestore.Timestamp | string): Date {
  if (value instanceof admin.firestore.Timestamp) return value.toDate();
  return new Date(value);
}

// ── Expo Push ──────────────────────────────────────────────────────────────────

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

async function sendExpoPushBatch(messages: ExpoMessage[]): Promise<void> {
  const BATCH_SIZE = 100;
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      functions.logger.warn('[sendExpoPushBatch] Expo API error', {
        status: res.status,
        body: await res.text(),
      });
    }
  }
}

// ── onUserDeleted ──────────────────────────────────────────────────────────────

export const onUserDeleted = functions.auth.user().onDelete(async (user) => {
  const uid = user.uid;
  functions.logger.info(`[onUserDeleted] Cleaning up uid=${uid}`);

  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();

  if (userSnap.exists) {
    const userData = userSnap.data() as UserDoc;
    const householdIds: string[] = userData.householdIds ?? [];

    for (const hid of householdIds) {
      const householdRef = db.collection('households').doc(hid);
      await householdRef.update({
        memberIds: admin.firestore.FieldValue.arrayRemove(uid),
      });
      await householdRef.collection('members').doc(uid).delete();
      functions.logger.info(`[onUserDeleted] Removed uid=${uid} from household=${hid}`);
    }
  }

  await userRef.delete();
  functions.logger.info(`[onUserDeleted] Deleted users/${uid}`);
});

// ── sendRentReminders ──────────────────────────────────────────────────────────
// Daily 9 am — queries leases, sends Expo push to users whose dueDay falls
// within their personal reminderDays window.

export const sendRentReminders = functions.pubsub
  .schedule('0 9 * * *')
  .timeZone('America/New_York')
  .onRun(async () => {
    functions.logger.info('[sendRentReminders] Starting job');

    const today = new Date();
    const todayDay = today.getDate();

    const leasesSnap = await db.collection('leases').get();
    const messages: ExpoMessage[] = [];

    await Promise.allSettled(
      leasesSnap.docs.map(async (leaseDoc) => {
        const lease = leaseDoc.data() as LeaseDoc;
        const { userId, address, dueDay, monthlyRent, leaseEnd } = lease;

        if (leaseEnd && new Date(leaseEnd) < today) return;

        const daysUntilDue = dueDay - todayDay;
        if (daysUntilDue < 0) return;

        const userSnap = await db.collection('users').doc(userId).get();
        if (!userSnap.exists) return;

        const user = userSnap.data() as UserDoc;
        const reminderDays = user.reminderDays ?? [7, 3, 1];
        const pushToken = user.pushToken;

        if (!pushToken || !reminderDays.includes(daysUntilDue)) return;

        messages.push({
          to: pushToken,
          title: 'Rent Due Soon',
          body: `Rent for ${address} ($${monthlyRent.toLocaleString()}) is due in ${daysUntilDue} day(s).`,
          data: {
            leaseId: leaseDoc.id,
            type: 'rent_reminder',
            daysUntilDue: String(daysUntilDue),
          },
        });
      })
    );

    await sendExpoPushBatch(messages);
    functions.logger.info(`[sendRentReminders] Sent ${messages.length} notifications`);
    return null;
  });

// ── createMonthlyBills ─────────────────────────────────────────────────────────

export const createMonthlyBills = functions.pubsub
  .schedule('0 8 15 * *')
  .timeZone('America/New_York')
  .onRun(async () => {
    functions.logger.info('[createMonthlyBills] Starting job');

    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonthYear = nextMonth.getFullYear();
    const nextMonthIndex = nextMonth.getMonth();

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const monthLabel = `${monthNames[nextMonthIndex]} ${nextMonthYear}`;

    const householdsSnap = await db.collection('households').get();

    await Promise.allSettled(
      householdsSnap.docs.map(async (householdDoc) => {
        const hid = householdDoc.id;
        const household = householdDoc.data() as HouseholdDoc;
        const { dueDay, rentAmount } = household;

        const lastDay = new Date(nextMonthYear, nextMonthIndex + 1, 0).getDate();
        const clampedDueDay = Math.min(dueDay, lastDay);
        const dueDate = new Date(nextMonthYear, nextMonthIndex, clampedDueDay);
        const dueDateTimestamp = admin.firestore.Timestamp.fromDate(dueDate);

        const billsRef = db.collection('households').doc(hid).collection('bills');
        const existing = await billsRef
          .where('dueDate', '>=', admin.firestore.Timestamp.fromDate(
            new Date(nextMonthYear, nextMonthIndex, 1)
          ))
          .where('dueDate', '<', admin.firestore.Timestamp.fromDate(
            new Date(nextMonthYear, nextMonthIndex + 1, 1)
          ))
          .limit(1)
          .get();

        if (!existing.empty) {
          functions.logger.info(
            `[createMonthlyBills] Bill already exists for household=${hid} month=${monthLabel}`
          );
          return;
        }

        const newBill: BillDoc = {
          label: `${monthLabel} Rent`,
          amount: rentAmount,
          dueDate: dueDateTimestamp,
          splitType: 'manual',
        };

        await billsRef.add(newBill);
        functions.logger.info(
          `[createMonthlyBills] Created bill for household=${hid} label="${newBill.label}"`
        );
      })
    );

    functions.logger.info('[createMonthlyBills] Job complete');
    return null;
  });

// ── generateExport ─────────────────────────────────────────────────────────────
// HTTPS callable — generates a PDF payment history for a lease, uploads to
// Storage, and returns a signed download URL valid for 24 hours.

export const generateExport = functions.https.onCall(
  async (data: GenerateExportData, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
    const userId = context.auth.uid;
    const { leaseId, dateRange } = data;

    const leaseSnap = await db.collection('leases').doc(leaseId).get();
    if (!leaseSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Lease not found');
    }
    const lease = leaseSnap.data() as LeaseDoc;
    if (lease.userId !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Not authorised');
    }

    const fromDate = new Date(dateRange.from);
    const endDate = new Date(dateRange.to);
    endDate.setHours(23, 59, 59, 999);

    const paymentsSnap = await db
      .collection('leases')
      .doc(leaseId)
      .collection('payments')
      .get();

    const bucket = storage.bucket();

    type PaymentRow = {
      confirmedAt: Date;
      amount: number;
      method: string;
      receiptUrl: string | null;
    };

    const rows: PaymentRow[] = (
      await Promise.all(
        paymentsSnap.docs.map(async (payDoc) => {
          const p = payDoc.data() as LeasePaymentDoc;
          const confirmedAt = toDate(p.confirmedAt);
          if (confirmedAt < fromDate || confirmedAt > endDate) return null;

          let receiptUrl: string | null = null;
          if (p.receiptStoragePath) {
            try {
              const [url] = await bucket.file(p.receiptStoragePath).getSignedUrl({
                action: 'read',
                expires: Date.now() + 24 * 60 * 60 * 1000,
              });
              receiptUrl = url;
            } catch {
              functions.logger.warn(
                `[generateExport] Could not sign receipt for payment ${payDoc.id}`
              );
            }
          }
          return { confirmedAt, amount: p.amount, method: p.method, receiptUrl };
        })
      )
    )
      .filter((r): r is PaymentRow => r !== null)
      .sort((a, b) => a.confirmedAt.getTime() - b.confirmedAt.getTime());

    // Build PDF
    const doc = new PDFDocument({ margin: 40, size: 'LETTER' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    await new Promise<void>((resolve, reject) => {
      doc.on('end', resolve);
      doc.on('error', reject);

      doc.fontSize(18).font('Helvetica-Bold').text('Rent Payment History', { align: 'center' });
      doc.moveDown(0.4);
      doc.fontSize(11).font('Helvetica').text(`Property: ${lease.address}`, { align: 'center' });
      doc.text(
        `Period: ${fromDate.toLocaleDateString('en-US')} – ${endDate.toLocaleDateString('en-US')}`,
        { align: 'center' }
      );
      doc.moveDown(1);

      // Column widths
      const COL = { date: 110, amount: 90, method: 90, receipt: 265 };
      const startX = 40;
      let y = doc.y;

      doc.font('Helvetica-Bold').fontSize(10);
      doc.text('Date',     startX,                       y, { width: COL.date,    continued: true });
      doc.text('Amount',   startX + COL.date,            y, { width: COL.amount,  continued: true });
      doc.text('Method',   startX + COL.date + COL.amount, y, { width: COL.method, continued: true });
      doc.text('Receipt',  startX + COL.date + COL.amount + COL.method, y, { width: COL.receipt });
      y = doc.y + 4;
      doc.moveTo(startX, y).lineTo(startX + COL.date + COL.amount + COL.method + COL.receipt, y).stroke();
      y += 6;

      doc.font('Helvetica').fontSize(10);
      for (const row of rows) {
        doc.text(row.confirmedAt.toLocaleDateString('en-US'), startX, y, { width: COL.date, continued: true });
        doc.text(
          `$${row.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          { width: COL.amount, continued: true }
        );
        doc.text(row.method, { width: COL.method, continued: true });
        doc.text(row.receiptUrl ?? '—', { width: COL.receipt });
        y = doc.y + 2;
      }

      const total = rows.reduce((sum, r) => sum + r.amount, 0);
      y += 8;
      doc.moveTo(startX, y).lineTo(startX + COL.date + COL.amount + COL.method + COL.receipt, y).stroke();
      y += 6;
      doc.font('Helvetica-Bold').fontSize(10).text(
        `Total Paid: $${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        startX, y, { align: 'right' }
      );

      doc.end();
    });

    const pdfBuffer = Buffer.concat(chunks);
    const exportDate = new Date().toISOString().slice(0, 10);
    const exportPath = `exports/${userId}/renttracker_history_${exportDate}.pdf`;
    const exportFile = bucket.file(exportPath);
    await exportFile.save(pdfBuffer, { contentType: 'application/pdf' });

    const [downloadUrl] = await exportFile.getSignedUrl({
      action: 'read',
      expires: Date.now() + 24 * 60 * 60 * 1000,
    });

    functions.logger.info(`[generateExport] Created ${exportPath}`);
    return { downloadUrl };
  }
);

// ── enforceFreemiumGate ────────────────────────────────────────────────────────
// Firestore onCreate trigger on leases/{leaseId}/payments/{paymentId}.
// Free tier: max 1 lease, max 12 distinct months of payment history.
// Over-limit payments are deleted and a rejection record is written so the
// client can surface a paywall prompt.

export const enforceFreemiumGate = functions.firestore
  .document('leases/{leaseId}/payments/{paymentId}')
  .onCreate(async (snap, context) => {
    const { leaseId, paymentId } = context.params;

    const leaseSnap = await db.collection('leases').doc(leaseId).get();
    if (!leaseSnap.exists) return;

    const lease = leaseSnap.data() as LeaseDoc;
    const userId = lease.userId;

    const userSnap = await db.collection('users').doc(userId).get();
    if (!userSnap.exists) return;

    const user = userSnap.data() as UserDoc;
    if ((user.tier ?? 'free') === 'pro') return;

    // Free tier: max 1 active lease
    const leasesSnap = await db
      .collection('leases')
      .where('userId', '==', userId)
      .get();

    if (leasesSnap.size > 1) {
      functions.logger.warn(
        `[enforceFreemiumGate] uid=${userId} exceeded lease limit — deleting payment ${paymentId}`
      );
      await snap.ref.delete();
      await db.collection('users').doc(userId).collection('freemiumRejections').add({
        reason: 'lease_limit',
        leaseId,
        paymentId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return;
    }

    // Free tier: max 12 distinct calendar months of history
    const allPaymentsSnap = await db
      .collection('leases')
      .doc(leaseId)
      .collection('payments')
      .get();

    const months = new Set<string>();
    for (const payDoc of allPaymentsSnap.docs) {
      const p = payDoc.data() as LeasePaymentDoc;
      const d = toDate(p.confirmedAt);
      months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    if (months.size > 12) {
      functions.logger.warn(
        `[enforceFreemiumGate] uid=${userId} exceeded 12-month history — deleting payment ${paymentId}`
      );
      await snap.ref.delete();
      await db.collection('users').doc(userId).collection('freemiumRejections').add({
        reason: 'history_limit',
        leaseId,
        paymentId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });

// ── sendLandlordInvite ─────────────────────────────────────────────────────────
// HTTPS callable — creates a landlordInvites doc and emails the landlord.
// SMTP credentials read from environment variables:
//   SMTP_HOST, SMTP_PORT (default 587), SMTP_USER, SMTP_PASS, FROM_EMAIL

export const sendLandlordInvite = functions.https.onCall(
  async (data: SendLandlordInviteData, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
    const userId = context.auth.uid;
    const { leaseId, landlordEmail, landlordName } = data;

    const leaseSnap = await db.collection('leases').doc(leaseId).get();
    if (!leaseSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Lease not found');
    }
    const lease = leaseSnap.data() as LeaseDoc;
    if (lease.userId !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Not authorised');
    }

    const inviteToken = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.collection('landlordInvites').doc(inviteToken).set({
      leaseId,
      landlordEmail,
      landlordName,
      createdByUserId: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    });

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT ?? '587');
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const fromEmail = process.env.FROM_EMAIL ?? smtpUser ?? 'noreply@renttracker.app';

    if (smtpHost && smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });

      const inviteUrl = `https://renttracker.app/landlord-connect?token=${inviteToken}`;

      await transporter.sendMail({
        from: fromEmail,
        to: landlordEmail,
        subject: 'Your tenant has connected with you on RentTracker',
        html: `
          <p>Hi ${landlordName},</p>
          <p>Your tenant has invited you to view their rent payment history for
             <strong>${lease.address}</strong> on RentTracker.</p>
          <p><a href="${inviteUrl}">Accept Invitation</a></p>
          <p>This link expires in 7 days.</p>
        `,
        text: [
          `Hi ${landlordName},`,
          '',
          `Your tenant has invited you to view their rent payment history`,
          `for ${lease.address} on RentTracker.`,
          '',
          `Accept: ${inviteUrl}`,
          '',
          'This link expires in 7 days.',
        ].join('\n'),
      });

      functions.logger.info(`[sendLandlordInvite] Email sent to ${landlordEmail}`);
    } else {
      functions.logger.warn('[sendLandlordInvite] SMTP not configured — skipping email');
    }

    return { inviteToken };
  }
);
