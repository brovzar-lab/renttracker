import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { IS_DEMO } from '../../constants/demo';
import DemoBadge from '../../components/DemoBadge';
import { useAuthStore } from '../../store/auth';
import { useLeaseStore } from '../../store/lease';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function daysUntilDue(dueDay: number): number {
  const today = new Date();
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), dueDay);
  if (thisMonth <= today) {
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
    return Math.ceil((nextMonth.getTime() - today.getTime()) / 86400000);
  }
  return Math.ceil((thisMonth.getTime() - today.getTime()) / 86400000);
}

export default function LeaseScreen() {
  const displayName = useAuthStore((s) => s.displayName);
  const signOutStore = useAuthStore((s) => s.signOut);
  const lease = useLeaseStore((s) => s.lease);
  const updateLease = useLeaseStore((s) => s.updateLease);

  const firstName = displayName?.split(' ')[0] ?? 'Jordan';

  function handleSendInvite() {
    if (IS_DEMO) {
      Alert.alert('Demo Mode', 'Invite would be sent to Sarah Chen in live mode.');
      return;
    }
    Alert.alert('Invite Sent', `Invitation sent to ${lease?.landlordEmail ?? 'landlord'}.`);
    updateLease({ landlordInviteStatus: 'active' });
  }

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          if (!IS_DEMO && auth) await signOut(auth);
          signOutStore();
        },
      },
    ]);
  }

  if (!lease) {
    return (
      <SafeAreaView style={styles.container}>
        {IS_DEMO && <View style={styles.badgeRow}><DemoBadge /></View>}
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No lease set up yet</Text>
          <Text style={styles.emptyBody}>Add your lease details to get started.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const days = daysUntilDue(lease.dueDay);
  const dueColor = days <= 3 ? Colors.danger : days <= 7 ? Colors.warning : Colors.success;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {IS_DEMO && <View style={styles.badgeRow}><DemoBadge /></View>}

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hey, {firstName}!</Text>
          <Text style={styles.unit}>{lease.unit} · {lease.address}</Text>
        </View>

        {/* Rent card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>MONTHLY RENT</Text>
          <Text style={styles.rentAmount}>${lease.monthlyRent.toLocaleString()}</Text>
          <View style={[styles.dueBadge, { backgroundColor: dueColor + '22' }]}>
            <Text style={[styles.dueText, { color: dueColor }]}>
              Due in {days} day{days !== 1 ? 's' : ''}
            </Text>
          </View>
          <Text style={styles.dueLine}>Due on the {lease.dueDay}{ordinal(lease.dueDay)} of each month</Text>
        </View>

        {/* Lease period */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>LEASE PERIOD</Text>
          <View style={styles.periodRow}>
            <View style={styles.periodItem}>
              <Text style={styles.periodLabel}>Start</Text>
              <Text style={styles.periodValue}>{formatDate(lease.leaseStart)}</Text>
            </View>
            <Text style={styles.periodArrow}>→</Text>
            <View style={styles.periodItem}>
              <Text style={styles.periodLabel}>End</Text>
              <Text style={styles.periodValue}>{formatDate(lease.leaseEnd)}</Text>
            </View>
          </View>
        </View>

        {/* Landlord */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>LANDLORD</Text>
          <View style={styles.landlordRow}>
            <View style={styles.landlordAvatar}>
              <Text style={styles.landlordInitial}>
                {lease.landlordName.charAt(0)}
              </Text>
            </View>
            <View style={styles.landlordInfo}>
              <Text style={styles.landlordName}>{lease.landlordName}</Text>
              <Text style={styles.landlordEmail}>{lease.landlordEmail}</Text>
            </View>
            <View
              style={[
                styles.inviteBadge,
                {
                  backgroundColor:
                    lease.landlordInviteStatus === 'pending'
                      ? Colors.warning + '22'
                      : Colors.success + '22',
                },
              ]}
            >
              <Text
                style={[
                  styles.inviteBadgeText,
                  {
                    color:
                      lease.landlordInviteStatus === 'pending'
                        ? Colors.warning
                        : Colors.success,
                  },
                ]}
              >
                {lease.landlordInviteStatus === 'pending' ? 'Pending' : 'Active'}
              </Text>
            </View>
          </View>
          {lease.landlordInviteStatus === 'pending' && (
            <TouchableOpacity style={styles.inviteBtn} onPress={handleSendInvite}>
              <Text style={styles.inviteBtnText}>Resend Invite to Landlord</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function ordinal(n: number): string {
  if (n >= 11 && n <= 13) return 'th';
  return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 40 },
  badgeRow: { marginBottom: 12 },
  header: { marginBottom: 20 },
  greeting: { fontSize: 26, fontWeight: '800', color: Colors.text },
  unit: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    gap: 8,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  rentAmount: { fontSize: 42, fontWeight: '900', color: Colors.text },
  dueBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  dueText: { fontSize: 13, fontWeight: '700' },
  dueLine: { fontSize: 13, color: Colors.textSecondary },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  periodItem: { flex: 1 },
  periodLabel: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  periodValue: { fontSize: 14, color: Colors.text, fontWeight: '700', marginTop: 2 },
  periodArrow: { fontSize: 18, color: Colors.textMuted, paddingHorizontal: 8 },
  landlordRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  landlordAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  landlordInitial: { color: Colors.white, fontWeight: '800', fontSize: 18 },
  landlordInfo: { flex: 1 },
  landlordName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  landlordEmail: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  inviteBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  inviteBadgeText: { fontSize: 12, fontWeight: '700' },
  inviteBtn: {
    borderWidth: 1,
    borderColor: Colors.warning,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  inviteBtnText: { color: Colors.warning, fontWeight: '600', fontSize: 14 },
  signOutBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  signOutText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 14 },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptyBody: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
});
