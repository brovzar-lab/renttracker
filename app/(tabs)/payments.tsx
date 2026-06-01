import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { IS_DEMO } from '../../constants/demo';
import DemoBadge from '../../components/DemoBadge';
import PaywallModal from '../../components/PaywallModal';
import { useAuthStore } from '../../store/auth';
import { useHouseholdStore } from '../../store/household';
import { usePaymentsStore } from '../../store/payments';
import { recordPayment } from '../../lib/firestore';
import type { PaymentMethod } from '../../store/payments';

const AVATAR_PALETTE = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];
function avatarColor(name: string): string {
  let n = 0;
  for (let i = 0; i < name.length; i++) n += name.charCodeAt(i);
  return AVATAR_PALETTE[n % AVATAR_PALETTE.length];
}
function methodIcon(m: PaymentMethod) { return m === 'venmo' ? '💸' : m === 'zelle' ? '🏦' : m === 'cash' ? '💵' : '💳'; }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
function cutoffISO() { const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString(); }

export default function PaymentsScreen() {
  const uid          = useAuthStore((s) => s.uid);
  const email        = useAuthStore((s) => s.email);
  const displayName  = useAuthStore((s) => s.displayName);
  const isPro        = useAuthStore((s) => s.isPro);
  const household    = useHouseholdStore((s) => s.household);
  const currentBill  = useHouseholdStore((s) => s.currentBill);
  const members      = useHouseholdStore((s) => s.members);
  const getMyShare   = useHouseholdStore((s) => s.getMyShare);
  const { payments, addPayment, hasPaidBill } = usePaymentsStore();

  const [showPaywall,   setShowPaywall]   = useState(false);
  const [hasTappedPay,  setHasTappedPay]  = useState(false);
  const [lastPayMethod, setLastPayMethod] = useState<PaymentMethod | null>(null);

  const myUid     = IS_DEMO ? 'demo-user-001' : (uid ?? '');
  const myShare   = getMyShare(myUid);
  const myName    = IS_DEMO ? 'Alex Chen' : (displayName ?? 'Me');
  const ownerEmail = IS_DEMO ? 'landlord@example.com' : (email ?? '');
  const billId    = currentBill?.id ?? '';
  const isPaid    = billId ? hasPaidBill(myUid, billId) : false;
  const dueLabel  = currentBill ? `${currentBill.month} — Due ${fmtDate(currentBill.dueDate)}` : 'No current bill';

  const cutoff  = cutoffISO();
  const allDesc = [...payments].sort((a, b) => (b.confirmedAt ?? b.createdAt) > (a.confirmedAt ?? a.createdAt) ? 1 : -1);
  const visible = isPro ? allDesc : allDesc.filter((p) => (p.confirmedAt ?? p.createdAt) >= cutoff);
  const hasMore = !isPro && visible.length < allDesc.length;

  async function doMarkPaid(method: PaymentMethod) {
    if (IS_DEMO) { Alert.alert('Demo mode', `Payment recorded via ${method} (not saved).`); return; }
    if (!household || !currentBill || !uid || !displayName) return;
    const now = new Date().toISOString();
    try { await recordPayment(household.id, { fromUserId: uid, fromDisplayName: displayName, amount: myShare, confirmedAt: now, billId: currentBill.id, method }); }
    catch (e) { console.error('[Payments] recordPayment error:', e); }
    addPayment({ fromUserId: uid, fromDisplayName: displayName, amount: myShare, confirmedAt: now, billId: currentBill.id, method });
  }

  function openApp(type: 'venmo' | 'zelle') {
    setHasTappedPay(true);
    setLastPayMethod(type);
    const url = type === 'venmo'
      ? `venmo://paycharge?txn=pay&recipients=${encodeURIComponent(ownerEmail)}&amount=${myShare}&note=Rent`
      : 'zelle://';
    if (IS_DEMO) { Alert.alert('Demo mode', `Would open: ${url}`); return; }
    Linking.openURL(url).catch(() => Alert.alert(`${type === 'venmo' ? 'Venmo' : 'Zelle'} not found`, 'Please install the app.'));
  }

  function confirmMark(method: PaymentMethod, label: string) {
    Alert.alert('Mark as Paid', `Confirm $${myShare.toLocaleString()} via ${label}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => doMarkPaid(method) },
    ]);
  }

  function memberName(fromUserId: string) {
    return members.find((m) => m.uid === fromUserId)?.displayName ?? fromUserId;
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.header}>
          <Text style={s.title}>Pay + Ledger</Text>
          {IS_DEMO && <DemoBadge />}
        </View>

        {/* SECTION 1 — Pay Now */}
        <Text style={s.sectionLabel}>PAY NOW</Text>
        <View style={s.card}>
          <Text style={s.billLabel}>{dueLabel}</Text>
          <Text style={s.billTotal}>${currentBill ? currentBill.amount.toLocaleString() : '—'} total</Text>
          <View style={s.shareRow}>
            <Text style={s.shareAmount}>${myShare.toLocaleString()}</Text>
            <View style={[s.badge, isPaid ? s.badgePaid : s.badgeDue]}>
              <Text style={[s.badgeText, { color: isPaid ? Colors.paid : Colors.warning }]}>
                {isPaid ? 'Paid' : 'Due'}
              </Text>
            </View>
          </View>

          {!isPaid && <>
            <View style={s.row}>
              <TouchableOpacity style={[s.payBtn, s.venmo]} onPress={() => openApp('venmo')}>
                <Text style={s.payBtnTxt}>💸 Venmo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.payBtn, s.zelle]} onPress={() => openApp('zelle')}>
                <Text style={s.payBtnTxt}>🏦 Zelle</Text>
              </TouchableOpacity>
            </View>
            {hasTappedPay && (
              <TouchableOpacity style={s.markBtn} onPress={() => confirmMark(lastPayMethod ?? 'other', lastPayMethod ?? 'app')}>
                <Text style={s.markBtnTxt}>Mark as Paid</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.cashBtn} onPress={() => confirmMark('cash', 'Cash')}>
              <Text style={s.cashBtnTxt}>Mark Paid (Cash)</Text>
            </TouchableOpacity>
          </>}
        </View>

        {/* SECTION 2 — Payment History */}
        <Text style={[s.sectionLabel, { marginTop: 24 }]}>PAYMENT HISTORY</Text>
        <View style={s.histList}>
          {visible.length === 0 && !hasMore
            ? <Text style={s.emptyTxt}>No payments recorded yet.</Text>
            : visible.map((p) => {
                const name = memberName(p.fromUserId);
                return (
                  <View key={p.id} style={s.histRow}>
                    <View style={[s.avatar, { backgroundColor: avatarColor(name) }]}>
                      <Text style={s.avatarTxt}>{name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.histName}>{name}</Text>
                      <Text style={s.histDate}>{fmtDate(p.confirmedAt ?? p.createdAt)}</Text>
                    </View>
                    <Text style={s.histIcon}>{methodIcon(p.method)}</Text>
                    <Text style={s.histAmt}>${p.amount.toLocaleString()}</Text>
                  </View>
                );
              })
          }
          {hasMore && (
            <TouchableOpacity style={s.upgradeRow} onPress={() => setShowPaywall(true)}>
              <Text style={s.upgradeTxt}>Upgrade for full history</Text>
              <Text style={s.upgradeChev}>›</Text>
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>
      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} reason="See your complete payment history." />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.background },
  scroll:     { paddingHorizontal: 20, paddingBottom: 48 },
  header:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8, paddingBottom: 20 },
  title:      { fontSize: 26, fontWeight: '800', color: Colors.text },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.2, marginBottom: 10 },
  card:       { backgroundColor: Colors.surface, borderRadius: 16, padding: 20, gap: 8 },
  billLabel:  { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  billTotal:  { fontSize: 13, color: Colors.textMuted },
  shareRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  shareAmount:{ fontSize: 40, fontWeight: '900', color: Colors.text },
  badge:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgePaid:  { backgroundColor: Colors.paid + '22' },
  badgeDue:   { backgroundColor: Colors.warning + '22' },
  badgeText:  { fontSize: 13, fontWeight: '700' },
  row:        { flexDirection: 'row', gap: 10, marginTop: 6 },
  payBtn:     { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  venmo:      { backgroundColor: '#5f2d91' },
  zelle:      { backgroundColor: '#2563eb' },
  payBtnTxt:  { color: Colors.white, fontWeight: '700', fontSize: 15 },
  markBtn:    { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  markBtnTxt: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  cashBtn:    { borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  cashBtnTxt: { color: Colors.textSecondary, fontWeight: '600', fontSize: 14 },
  histList:   { gap: 6 },
  histRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, padding: 12, gap: 10 },
  avatar:     { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  avatarTxt:  { color: Colors.white, fontWeight: '700', fontSize: 16 },
  histName:   { fontSize: 14, fontWeight: '700', color: Colors.text },
  histDate:   { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  histIcon:   { fontSize: 18 },
  histAmt:    { fontSize: 15, fontWeight: '800', color: Colors.text, minWidth: 64, textAlign: 'right' },
  upgradeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.primary + '18', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.primary + '44' },
  upgradeTxt: { color: Colors.primary, fontWeight: '600', fontSize: 14 },
  upgradeChev:{ color: Colors.primary, fontSize: 20, fontWeight: '700' },
  emptyTxt:   { color: Colors.textMuted, fontSize: 14, paddingVertical: 20, textAlign: 'center' },
});
