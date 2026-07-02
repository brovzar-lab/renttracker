import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { IS_DEMO } from '../../constants/demo';
import DemoBadge from '../../components/DemoBadge';
import { useLeaseStore } from '../../store/lease';
import { usePaymentsStore } from '../../store/payments';
import { useAuthStore } from '../../store/auth';

function fmtDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ExportScreen() {
  const displayName = useAuthStore((s) => s.displayName);
  const lease = useLeaseStore((s) => s.lease);
  const payments = usePaymentsStore((s) => s.payments);

  const onTimeCount = payments.filter((p) => p.status === 'on_time').length;
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  function handleExportPDF() {
    if (IS_DEMO) {
      Alert.alert('Demo Mode', 'Demo mode — PDF not generated');
      return;
    }
    Alert.alert('Export PDF', 'PDF export requires a live account connection.');
  }

  function handleShareSummary() {
    if (IS_DEMO) {
      Alert.alert('Demo Mode', 'Demo mode — PDF not generated');
      return;
    }
    if (!lease) return;
    const summary = [
      `RentTracker — Payment Summary`,
      `Tenant: ${displayName ?? 'Tenant'}`,
      `Unit: ${lease.unit}, ${lease.address}`,
      `Lease: ${fmtDate(lease.leaseStart)} – ${fmtDate(lease.leaseEnd)}`,
      `Monthly Rent: $${lease.monthlyRent}/mo`,
      `Payments on time: ${onTimeCount}/${payments.length}`,
      `Total paid: $${totalPaid.toLocaleString()}`,
    ].join('\n');

    Share.share({ message: summary }).catch(() => null);
  }

  function handleEmailLandlord() {
    if (IS_DEMO) {
      Alert.alert('Demo Mode', 'Demo mode — email not sent');
      return;
    }
    Alert.alert('Email Sent', `Summary sent to ${lease?.landlordEmail ?? 'landlord'}.`);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Export + Share</Text>
          {IS_DEMO && <DemoBadge />}
        </View>

        {/* Preview card */}
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>Payment Summary</Text>
          {lease && (
            <>
              <View style={styles.previewRow}>
                <Text style={styles.previewKey}>Tenant</Text>
                <Text style={styles.previewValue}>{displayName ?? 'Jordan Martinez'}</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewKey}>Unit</Text>
                <Text style={styles.previewValue}>{lease.unit}</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewKey}>Address</Text>
                <Text style={styles.previewValue}>{lease.address}</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewKey}>Lease period</Text>
                <Text style={styles.previewValue}>
                  {fmtDate(lease.leaseStart)} – {fmtDate(lease.leaseEnd)}
                </Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewKey}>Monthly rent</Text>
                <Text style={styles.previewValue}>${lease.monthlyRent}/mo</Text>
              </View>
              <View style={[styles.previewRow, styles.previewDivider]}>
                <Text style={styles.previewKey}>Payments on time</Text>
                <Text style={[styles.previewValue, { color: Colors.success }]}>
                  {onTimeCount}/{payments.length}
                </Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewKey}>Total paid</Text>
                <Text style={[styles.previewValue, { color: Colors.success, fontWeight: '800' }]}>
                  ${totalPaid.toLocaleString()}
                </Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewKey}>On-time rate</Text>
                <Text style={[styles.previewValue, { color: Colors.success, fontWeight: '800' }]}>
                  {payments.length > 0 ? Math.round((onTimeCount / payments.length) * 100) : 100}%
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Action buttons */}
        <Text style={styles.sectionLabel}>EXPORT OPTIONS</Text>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleExportPDF}>
          <Text style={styles.primaryBtnIcon}>📄</Text>
          <View>
            <Text style={styles.primaryBtnText}>Export PDF Report</Text>
            <Text style={styles.primaryBtnSub}>Full payment history as PDF</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={handleShareSummary}>
          <Text style={styles.secondaryBtnIcon}>📤</Text>
          <View>
            <Text style={styles.secondaryBtnText}>Share Summary</Text>
            <Text style={styles.secondaryBtnSub}>Text summary via Messages, AirDrop, etc.</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={handleEmailLandlord}>
          <Text style={styles.secondaryBtnIcon}>✉️</Text>
          <View>
            <Text style={styles.secondaryBtnText}>Email Landlord</Text>
            <Text style={styles.secondaryBtnSub}>
              Send to {lease?.landlordName ?? 'landlord'}
              {lease?.landlordInviteStatus === 'pending' ? ' (invite pending)' : ''}
            </Text>
          </View>
        </TouchableOpacity>

        {IS_DEMO && (
          <View style={styles.demoNote}>
            <Text style={styles.demoNoteText}>
              All export actions show "Demo mode — PDF not generated" in demo mode.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text },

  previewCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewDivider: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
    marginTop: 4,
  },
  previewKey: { fontSize: 13, color: Colors.textSecondary },
  previewValue: { fontSize: 13, color: Colors.text, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
  },
  primaryBtnIcon: { fontSize: 28 },
  primaryBtnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  primaryBtnSub: { color: Colors.white + 'aa', fontSize: 12, marginTop: 2 },

  secondaryBtn: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryBtnIcon: { fontSize: 28 },
  secondaryBtnText: { color: Colors.text, fontWeight: '700', fontSize: 16 },
  secondaryBtnSub: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },

  demoNote: {
    backgroundColor: Colors.accent + '18',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.accent + '44',
    marginTop: 8,
  },
  demoNoteText: { color: Colors.accent, fontSize: 13, fontWeight: '500', textAlign: 'center' },
});
