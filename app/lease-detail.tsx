import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { IS_DEMO } from '../constants/demo';
import { useAuthStore } from '../store/auth';
import { useLeasesStore } from '../store/leases';
import { usePaymentsStore } from '../store/payments';
import { deleteLease as deleteLeaseFS, deleteLeaseDocument as deleteDocFS } from '../lib/firestore';
import { deleteStorageFile, formatBytes } from '../lib/storage';

export default function LeaseDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const uid = useAuthStore((s) => s.uid);
  const { leases, deleteLease, deleteDocument } = useLeasesStore();
  const payments = usePaymentsStore((s) => s.payments);

  const lease = leases.find((l) => l.id === id);

  if (!lease) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.notFound}>Lease not found.</Text>
      </SafeAreaView>
    );
  }

  const leasePayments = payments
    .filter((p) => p.leaseId === lease.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleDeleteDoc = (docId: string, filename: string, sizeBytes: number) => {
    Alert.alert('Delete Document', `Remove "${filename}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (IS_DEMO) {
            Alert.alert('Demo mode', 'Demo mode — not saved');
            return;
          }
          deleteDocument(lease.id, docId);
          if (uid) {
            await deleteDocFS(uid, lease.id, docId, sizeBytes);
            await deleteStorageFile(`users/${uid}/leases/${lease.id}/documents/${filename}`);
          }
        },
      },
    ]);
  };

  const handleDeleteLease = () => {
    Alert.alert(
      'Delete Lease',
      `Remove "${lease.address}"? This will also remove all associated documents.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (IS_DEMO) {
              Alert.alert('Demo mode', 'Demo mode — not saved');
              return;
            }
            deleteLease(lease.id);
            if (uid) await deleteLeaseFS(uid, lease.id);
            router.back();
          },
        },
      ]
    );
  };

  const today = new Date();
  const isActive = !lease.leaseEnd || new Date(lease.leaseEnd) >= today;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Lease info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.badge, { backgroundColor: isActive ? Colors.primary + '22' : Colors.textMuted + '22' }]}>
              <Text style={[styles.badgeText, { color: isActive ? Colors.primary : Colors.textMuted }]}>
                {isActive ? 'Active' : 'Expired'}
              </Text>
            </View>
          </View>
          <Text style={styles.address}>{lease.address}</Text>

          <View style={styles.divider} />

          <InfoRow label="Landlord" value={lease.landlordName || '—'} />
          <InfoRow label="Contact" value={lease.landlordContact || '—'} />
          <InfoRow label="Monthly Rent" value={`$${lease.monthlyRent.toLocaleString()}`} highlight />
          <InfoRow label="Lease Start" value={formatDate(lease.leaseStart)} />
          <InfoRow label="Lease End" value={lease.leaseEnd ? formatDate(lease.leaseEnd) : 'Month-to-month'} />
          <InfoRow label="Storage Used" value={formatBytes(lease.totalStorageBytes)} />
        </View>

        {/* Documents */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Documents</Text>
          <TouchableOpacity
            style={styles.uploadBtn}
            onPress={() => router.push({ pathname: '/document-upload', params: { leaseId: lease.id } })}
          >
            <Text style={styles.uploadBtnText}>+ Upload</Text>
          </TouchableOpacity>
        </View>

        {lease.documents.length === 0 ? (
          <View style={styles.emptyDocs}>
            <Text style={styles.emptyDocsText}>No documents uploaded yet</Text>
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/document-upload', params: { leaseId: lease.id } })}
            >
              <Text style={styles.emptyDocsLink}>Upload a PDF</Text>
            </TouchableOpacity>
          </View>
        ) : (
          lease.documents.map((d) => (
            <View key={d.id} style={styles.docCard}>
              <View style={styles.docInfo}>
                <Text style={styles.docIcon}>📎</Text>
                <View style={styles.docDetails}>
                  <Text style={styles.docFilename} numberOfLines={1}>{d.filename}</Text>
                  <Text style={styles.docMeta}>
                    {formatBytes(d.sizeBytes)} · {formatDate(d.uploadedAt)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.docDeleteBtn}
                onPress={() => handleDeleteDoc(d.id, d.filename, d.sizeBytes)}
                accessibilityLabel={`Delete ${d.filename}`}
              >
                <Text style={styles.docDeleteIcon}>🗑</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* Payment history */}
        {leasePayments.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 12 }]}>Payment History</Text>
            {leasePayments.map((p) => (
              <View key={p.id} style={styles.payRow}>
                <Text style={styles.payDate}>{formatDate(p.date)}</Text>
                <View style={styles.payRight}>
                  <Text style={styles.payAmount}>${p.amount.toLocaleString()}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor(p.status) + '22' }]}>
                    <Text style={[styles.statusText, { color: statusColor(p.status) }]}>
                      {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Delete lease */}
        <TouchableOpacity style={styles.deleteLeaseBtn} onPress={handleDeleteLease}>
          <Text style={styles.deleteLeaseText}>Delete Lease</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, highlight && { color: Colors.primary, fontWeight: '700' }]}>
        {value}
      </Text>
    </View>
  );
}

function statusColor(status: 'paid' | 'pending' | 'late'): string {
  return status === 'paid' ? Colors.paid : status === 'pending' ? Colors.pending : Colors.late;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 60 },
  notFound: { color: Colors.textSecondary, textAlign: 'center', marginTop: 40, fontSize: 16 },
  card: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 20 },
  cardHeader: { marginBottom: 8 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  address: { fontSize: 17, fontWeight: '700', color: Colors.text, lineHeight: 24 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 14 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  infoLabel: { fontSize: 14, color: Colors.textSecondary },
  infoValue: { fontSize: 14, color: Colors.text, maxWidth: 200 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  uploadBtn: { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  uploadBtnText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  emptyDocs: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyDocsText: { color: Colors.textMuted, fontSize: 14 },
  emptyDocsLink: { color: Colors.primary, fontSize: 14, fontWeight: '600' },
  docCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  docInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  docIcon: { fontSize: 20 },
  docDetails: { flex: 1 },
  docFilename: { fontSize: 14, fontWeight: '600', color: Colors.text },
  docMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  docDeleteBtn: { padding: 8, minWidth: 40, alignItems: 'center' },
  docDeleteIcon: { fontSize: 16 },
  payRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  payDate: { fontSize: 14, color: Colors.text },
  payRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  payAmount: { fontSize: 14, fontWeight: '700', color: Colors.text },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },
  deleteLeaseBtn: {
    marginTop: 32,
    borderWidth: 1,
    borderColor: Colors.danger + '55',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  deleteLeaseText: { color: Colors.danger, fontWeight: '600', fontSize: 15 },
});
