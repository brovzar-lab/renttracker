import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { IS_DEMO } from '../../constants/demo';
import DemoBadge from '../../components/DemoBadge';
import { useAuthStore } from '../../store/auth';
import { useHouseholdStore } from '../../store/household';
import { usePaymentsStore } from '../../store/payments';

function getDaysUntil(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });
}

export default function HomeScreen() {
  const uid = useAuthStore((s) => s.uid);
  const displayName = useAuthStore((s) => s.displayName);
  const household = useHouseholdStore((s) => s.household);
  const members = useHouseholdStore((s) => s.members);
  const currentBill = useHouseholdStore((s) => s.currentBill);
  const payments = usePaymentsStore((s) => s.payments);

  const firstName = displayName ? displayName.split(' ')[0] : 'there';
  const myMember = members.find((m) => m.uid === uid);

  // Determine if current user has paid — handle both fromUserId and memberId (demo cast)
  const hasPaid = currentBill
    ? payments.some((p) => {
        const raw = p as unknown as Record<string, unknown>;
        const payer = (raw.fromUserId ?? raw.memberId) as string | undefined;
        return payer === uid && p.billId === currentBill.id;
      })
    : false;

  // Roommate paid status
  const roommateStatuses = members
    .filter((m) => m.uid !== uid)
    .map((m) => {
      const paid = currentBill
        ? payments.some((p) => {
            const raw = p as unknown as Record<string, unknown>;
            const payer = (raw.fromUserId ?? raw.memberId) as string | undefined;
            return payer === m.uid && p.billId === currentBill.id;
          })
        : false;
      return { ...m, paid };
    });

  const daysUntil = currentBill ? getDaysUntil(currentBill.dueDate) : 0;
  const countdownColor =
    daysUntil > 7 ? Colors.success : daysUntil >= 1 ? Colors.warning : Colors.danger;
  const countdownLabel =
    daysUntil < 0
      ? 'Overdue'
      : daysUntil === 0
      ? 'Due today'
      : `${daysUntil} day${daysUntil !== 1 ? 's' : ''} until due`;

  function openVenmo(): void {
    if (!myMember || !currentBill) return;
    const landlordEmail = household?.ownerId ?? '';
    const url = `venmo://paycharge?txn=pay&recipients=${encodeURIComponent(landlordEmail)}&amount=${myMember.shareAmount}&note=Rent`;
    if (IS_DEMO) {
      Alert.alert('Demo Mode', `Would open Venmo to pay ${formatCurrency(myMember.shareAmount)}`);
    } else {
      Linking.openURL(url).catch(() =>
        Alert.alert('Venmo not installed', 'Please install Venmo to use this feature.')
      );
    }
  }

  function openZelle(): void {
    if (IS_DEMO) {
      Alert.alert('Demo Mode', 'Would open Zelle to pay rent');
    } else {
      Linking.openURL('zelle://').catch(() =>
        Alert.alert('Zelle not installed', 'Please install Zelle to use this feature.')
      );
    }
  }

  // Empty state
  if (!household) {
    return (
      <SafeAreaView style={styles.container}>
        {IS_DEMO && (
          <View style={styles.demoRow}>
            <DemoBadge />
          </View>
        )}
        <View style={styles.emptyWrap}>
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No household yet</Text>
            <Text style={styles.emptyBody}>
              Create or join a household to start tracking your rent split with roommates.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {IS_DEMO && (
          <View style={styles.demoRow}>
            <DemoBadge />
          </View>
        )}

        {/* Greeting */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hey, {firstName}!</Text>
          <Text style={styles.householdName}>{household.name}</Text>
        </View>

        {/* Current bill card */}
        {currentBill && (
          <View style={styles.billCard}>
            <Text style={styles.billLabel}>{currentBill.month} Rent</Text>
            <Text style={styles.billTotal}>{formatCurrency(currentBill.amount)}</Text>
            <View style={[styles.countdownBadge, { backgroundColor: countdownColor + '22' }]}>
              <Text style={[styles.countdownText, { color: countdownColor }]}>{countdownLabel}</Text>
            </View>

            {/* Your share */}
            {myMember && (
              <View style={styles.shareRow}>
                <View>
                  <Text style={styles.shareLabel}>Your share</Text>
                  <Text style={styles.shareAmount}>{formatCurrency(myMember.shareAmount)}</Text>
                  <Text style={styles.sharePercent}>{myMember.sharePercent}% of total</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: hasPaid ? Colors.paid + '22' : Colors.warning + '22' }]}>
                  <Text style={[styles.statusText, { color: hasPaid ? Colors.paid : Colors.warning }]}>
                    {hasPaid ? 'Paid' : 'Due'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Roommate statuses */}
        {roommateStatuses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Roommates</Text>
            {roommateStatuses.map((r) => (
              <View key={r.uid} style={styles.roommateRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{r.displayName.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.roommateInfo}>
                  <Text style={styles.roommateName}>{r.displayName}</Text>
                  <Text style={styles.roommateAmount}>{formatCurrency(r.shareAmount)}</Text>
                </View>
                <Text style={[styles.roommateStatus, { color: r.paid ? Colors.paid : Colors.warning }]}>
                  {r.paid ? '✓ Paid' : '○ Unpaid'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Pay buttons — only shown if not yet paid */}
        {!hasPaid && currentBill && (
          <View style={styles.paySection}>
            <TouchableOpacity style={styles.venmoBtn} onPress={openVenmo}>
              <Text style={styles.venmoBtnText}>Pay via Venmo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.zelleBtn} onPress={openZelle}>
              <Text style={styles.zelleBtnText}>Pay via Zelle</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 40 },
  demoRow: { marginBottom: 16, alignItems: 'center' },
  header: { marginBottom: 24 },
  greeting: { fontSize: 26, fontWeight: '800', color: Colors.text },
  householdName: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  billCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    gap: 8,
  },
  billLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  billTotal: { fontSize: 36, fontWeight: '800', color: Colors.text },
  countdownBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  countdownText: { fontSize: 13, fontWeight: '700' },
  shareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.border },
  shareLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  shareAmount: { fontSize: 22, fontWeight: '800', color: Colors.text, marginTop: 2 },
  sharePercent: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  statusText: { fontSize: 14, fontWeight: '800' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  roommateRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  roommateInfo: { flex: 1 },
  roommateName: { fontSize: 14, color: Colors.text, fontWeight: '600' },
  roommateAmount: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  roommateStatus: { fontSize: 13, fontWeight: '700' },
  paySection: { gap: 12 },
  venmoBtn: { backgroundColor: '#5c36d4', borderRadius: 14, padding: 16, alignItems: 'center' },
  venmoBtnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  zelleBtn: { backgroundColor: '#0073e6', borderRadius: 14, padding: 16, alignItems: 'center' },
  zelleBtnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  emptyWrap: { flex: 1, justifyContent: 'center', padding: 20 },
  emptyCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 24, alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  emptyBody: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
