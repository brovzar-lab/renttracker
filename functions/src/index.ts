import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const messaging = admin.messaging();

// ── Interfaces ────────────────────────────────────────────────────────────────

interface UserDoc {
  householdIds: string[];
}

interface HouseholdDoc {
  name: string;
  rentAmount: number;
  dueDay: number;
  memberIds: string[];
  ownerId: string;
}

interface MemberDoc {
  notificationsEnabled: boolean;
  fcmToken: string | null;
  reminderDays: number[];
  shareAmount: number;
}

interface BillDoc {
  label: string;
  amount: number;
  dueDate: admin.firestore.Timestamp;
  splitType: string;
}

interface PaymentDoc {
  memberId: string;
  billId: string;
  paidAt: admin.firestore.Timestamp | null;
}

// ── onUserDeleted ─────────────────────────────────────────────────────────────

export const onUserDeleted = functions.auth.user().onDelete(async (user) => {
  const uid = user.uid;
  functions.logger.info(`[onUserDeleted] Cleaning up uid=${uid}`);

  // Read user doc to get householdIds
  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();

  if (userSnap.exists) {
    const userData = userSnap.data() as UserDoc;
    const householdIds: string[] = userData.householdIds ?? [];

    for (const hid of householdIds) {
      const householdRef = db.collection('households').doc(hid);

      // Remove uid from memberIds
      await householdRef.update({
        memberIds: admin.firestore.FieldValue.arrayRemove(uid),
      });

      // Delete members/{uid} subcollection doc
      await householdRef.collection('members').doc(uid).delete();

      functions.logger.info(`[onUserDeleted] Removed uid=${uid} from household=${hid}`);
    }
  }

  // Delete the user doc itself
  await userRef.delete();
  functions.logger.info(`[onUserDeleted] Deleted users/${uid}`);
});

// ── sendRentReminders ─────────────────────────────────────────────────────────

export const sendRentReminders = functions.pubsub
  .schedule('0 9 * * *')
  .timeZone('America/New_York')
  .onRun(async () => {
    functions.logger.info('[sendRentReminders] Starting job');

    const today = new Date();
    const todayDayOfMonth = today.getDate();
    const reminderOffsets: number[] = [7, 3, 1];

    const householdsSnap = await db.collection('households').get();

    const householdPromises = householdsSnap.docs.map(async (householdDoc) => {
      const hid = householdDoc.id;
      const household = householdDoc.data() as HouseholdDoc;
      const { dueDay, name, memberIds } = household;

      // Compute days until due
      const daysUntilDue = dueDay - todayDayOfMonth;

      if (!reminderOffsets.includes(daysUntilDue)) return;

      functions.logger.info(
        `[sendRentReminders] household=${hid} daysUntilDue=${daysUntilDue}`
      );

      // Determine current month bill
      const now = new Date();
      const billsSnap = await db
        .collection('households')
        .doc(hid)
        .collection('bills')
        .where('dueDate', '>=', admin.firestore.Timestamp.fromDate(
          new Date(now.getFullYear(), now.getMonth(), 1)
        ))
        .where('dueDate', '<', admin.firestore.Timestamp.fromDate(
          new Date(now.getFullYear(), now.getMonth() + 1, 1)
        ))
        .limit(1)
        .get();

      const billId = billsSnap.empty ? null : billsSnap.docs[0].id;

      const memberPromises = memberIds.map(async (uid) => {
        const memberSnap = await db
          .collection('households')
          .doc(hid)
          .collection('members')
          .doc(uid)
          .get();

        if (!memberSnap.exists) return;

        const member = memberSnap.data() as MemberDoc;

        if (!member.notificationsEnabled) return;
        if (!member.fcmToken) return;
        if (!member.reminderDays.includes(daysUntilDue)) return;

        // Check if member has already paid this month's bill
        if (billId) {
          const paymentsSnap = await db
            .collection('households')
            .doc(hid)
            .collection('payments')
            .where('memberId', '==', uid)
            .where('billId', '==', billId)
            .limit(1)
            .get();

          if (!paymentsSnap.empty) {
            const payment = paymentsSnap.docs[0].data() as PaymentDoc;
            if (payment.paidAt !== null) return; // already paid
          }
        }

        const shareAmount = member.shareAmount ?? 0;
        const formattedAmount = shareAmount.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

        try {
          await messaging.send({
            token: member.fcmToken,
            notification: {
              title: 'Rent Reminder',
              body: `Your share for ${name} ($${formattedAmount}) is due in ${daysUntilDue} day(s).`,
            },
            data: {
              householdId: hid,
              type: 'rent_reminder',
              daysUntilDue: String(daysUntilDue),
            },
          });
          functions.logger.info(
            `[sendRentReminders] Sent to uid=${uid} household=${hid} daysUntilDue=${daysUntilDue}`
          );
        } catch (err) {
          functions.logger.warn(
            `[sendRentReminders] Failed to send to uid=${uid}:`,
            err
          );
        }
      });

      await Promise.allSettled(memberPromises);
    });

    await Promise.allSettled(householdPromises);
    functions.logger.info('[sendRentReminders] Job complete');
    return null;
  });

// ── createMonthlyBills ────────────────────────────────────────────────────────

export const createMonthlyBills = functions.pubsub
  .schedule('0 8 15 * *')
  .timeZone('America/New_York')
  .onRun(async () => {
    functions.logger.info('[createMonthlyBills] Starting job');

    const now = new Date();

    // Compute next month
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonthYear = nextMonth.getFullYear();
    const nextMonthIndex = nextMonth.getMonth(); // 0-based

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const monthLabel = `${monthNames[nextMonthIndex]} ${nextMonthYear}`;

    const householdsSnap = await db.collection('households').get();

    const promises = householdsSnap.docs.map(async (householdDoc) => {
      const hid = householdDoc.id;
      const household = householdDoc.data() as HouseholdDoc;
      const { dueDay, rentAmount } = household;

      // Build dueDate: next month with dueDay, clamped to last day of month
      const lastDayOfNextMonth = new Date(nextMonthYear, nextMonthIndex + 1, 0).getDate();
      const clampedDueDay = Math.min(dueDay, lastDayOfNextMonth);
      const dueDate = new Date(nextMonthYear, nextMonthIndex, clampedDueDay);
      const dueDateTimestamp = admin.firestore.Timestamp.fromDate(dueDate);

      // Check if a bill already exists for that month
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
    });

    await Promise.allSettled(promises);
    functions.logger.info('[createMonthlyBills] Job complete');
    return null;
  });
