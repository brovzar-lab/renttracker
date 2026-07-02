import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { IS_DEMO } from '../../constants/demo';
import DemoBadge from '../../components/DemoBadge';
import { useLeaseStore } from '../../store/lease';
import { usePaymentsStore } from '../../store/payments';
import type { PaymentRecord, PaymentMethod } from '../../store/payments';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtMonth(ym: string): string {
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function methodLabel(m: PaymentMethod): string {
  return m === 'venmo' ? 'Venmo' : m === 'zelle' ? 'Zelle' : m === 'cash' ? 'Cash' : m === 'check' ? 'Check' : 'Other';
}

function methodIcon(m: PaymentMethod): string {
  return m === 'venmo' ? '💸' : m === 'zelle' ? '🏦' : m === 'cash' ? '💵' : m === 'check' ? '📝' : '💳';
}

// ─── Receipt Modal ────────────────────────────────────────────────────────────

function ReceiptModal({ uri, visible, onClose }: { uri: string; visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={rm.overlay} activeOpacity={1} onPress={onClose}>
        <View style={rm.container}>
          <Text style={rm.title}>Receipt</Text>
          <Image source={{ uri }} style={rm.image} resizeMode="contain" />
          <TouchableOpacity style={rm.closeBtn} onPress={onClose}>
            <Text style={rm.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const rm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#000000cc', justifyContent: 'center', alignItems: 'center', padding: 24 },
  container: { backgroundColor: Colors.surface, borderRadius: 20, padding: 20, width: '100%', alignItems: 'center', gap: 16 },
  title: { fontSize: 17, fontWeight: '700', color: Colors.text },
  image: { width: '100%', height: 360, borderRadius: 12, backgroundColor: Colors.background },
  closeBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32 },
  closeBtnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
});

// ─── Payment Row ──────────────────────────────────────────────────────────────

function PaymentRow({ payment, onReceiptTap }: { payment: PaymentRecord; onReceiptTap: (uri: string) => void }) {
  return (
    <View style={s.row}>
      <View style={s.rowLeft}>
        <View style={[s.statusDot, { backgroundColor: payment.status === 'on_time' ? Colors.success : Colors.danger }]} />
        <View style={s.rowInfo}>
          <Text style={s.rowMonth}>{fmtMonth(payment.month)}</Text>
          <Text style={s.rowMeta}>
            {methodIcon(payment.method)} {methodLabel(payment.method)} · {fmtDate(payment.paidDate)}
          </Text>
        </View>
      </View>
      <View style={s.rowRight}>
        <Text style={s.rowAmount}>${payment.amount.toLocaleString()}</Text>
        {payment.receiptUri ? (
          <TouchableOpacity
            style={s.receiptThumb}
            onPress={() => onReceiptTap(payment.receiptUri!)}
          >
            <Image source={{ uri: payment.receiptUri }} style={s.receiptImage} />
            <View style={s.receiptOverlay}>
              <Text style={s.receiptLabel}>View</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={s.noReceipt}>
            <Text style={s.noReceiptText}>No receipt</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PaymentsScreen() {
  const lease = useLeaseStore((s) => s.lease);
  const { payments, addPayment, hasPaymentForMonth } = usePaymentsStore();

  const [receiptUri, setReceiptUri] = useState<string | null>(null);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthPaid = hasPaymentForMonth(currentMonth);

  function handleLogPayment() {
    if (IS_DEMO) {
      Alert.alert('Demo Mode', 'Payment log is read-only in demo mode.');
      return;
    }
    if (currentMonthPaid) {
      Alert.alert('Already Recorded', 'You already have a payment recorded for this month.');
      return;
    }
    if (!lease) return;
    addPayment({
      leaseId: lease.id,
      month: currentMonth,
      amount: lease.monthlyRent,
      paidDate: new Date().toISOString().slice(0, 10),
      method: 'other',
      status: 'on_time',
    });
    Alert.alert('Recorded', 'Payment recorded for this month.');
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.title}>Payment Log</Text>
          {IS_DEMO && <DemoBadge />}
        </View>

        {/* Summary */}
        <View style={s.summaryCard}>
          <View style={s.summaryItem}>
            <Text style={s.summaryValue}>{payments.length}</Text>
            <Text style={s.summaryLabel}>Payments</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryItem}>
            <Text style={s.summaryValue}>
              ${payments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
            </Text>
            <Text style={s.summaryLabel}>Total Paid</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryItem}>
            <Text style={[s.summaryValue, { color: Colors.success }]}>100%</Text>
            <Text style={s.summaryLabel}>On Time</Text>
          </View>
        </View>

        {/* Log button */}
        <TouchableOpacity
          style={[s.logBtn, currentMonthPaid && s.logBtnPaid]}
          onPress={handleLogPayment}
        >
          <Text style={s.logBtnText}>
            {currentMonthPaid ? '✓ This Month Recorded' : '+ Log Payment for This Month'}
          </Text>
        </TouchableOpacity>

        {/* Payment list */}
        <Text style={s.sectionLabel}>RECENT PAYMENTS</Text>
        {payments.length === 0 ? (
          <Text style={s.emptyText}>No payments recorded yet.</Text>
        ) : (
          payments.map((p) => (
            <PaymentRow
              key={p.id}
              payment={p}
              onReceiptTap={(uri) => setReceiptUri(uri)}
            />
          ))
        )}
      </ScrollView>

      {receiptUri && (
        <ReceiptModal
          uri={receiptUri}
          visible={true}
          onClose={() => setReceiptUri(null)}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text },

  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  summaryItem: { alignItems: 'center', gap: 4 },
  summaryValue: { fontSize: 24, fontWeight: '800', color: Colors.text },
  summaryLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  summaryDivider: { width: 1, height: 36, backgroundColor: Colors.border },

  logBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  logBtnPaid: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.success },
  logBtnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  emptyText: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 20 },

  row: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  rowInfo: { flex: 1 },
  rowMonth: { fontSize: 15, fontWeight: '700', color: Colors.text },
  rowMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  rowRight: { alignItems: 'flex-end', gap: 6 },
  rowAmount: { fontSize: 16, fontWeight: '800', color: Colors.text },

  receiptThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  receiptImage: { width: '100%', height: '100%' },
  receiptOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#00000088',
    alignItems: 'center',
    paddingVertical: 2,
  },
  receiptLabel: { color: Colors.white, fontSize: 9, fontWeight: '700' },

  noReceipt: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noReceiptText: { fontSize: 8, color: Colors.textMuted, fontWeight: '600' },
});
