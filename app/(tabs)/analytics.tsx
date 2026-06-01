import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { IS_DEMO } from '../../constants/demo';
import DemoBadge from '../../components/DemoBadge';
import { useHouseholdStore } from '../../store/household';
import type { HouseholdMember } from '../../store/household';
import { setMemberShare } from '../../lib/firestore';

type Mode = 'equal' | 'custom';

export default function SplitCalculatorScreen() {
  const household = useHouseholdStore((s) => s.household);
  const members = useHouseholdStore((s) => s.members);
  const updateMemberShares = useHouseholdStore((s) => s.updateMemberShares);
  const [mode, setMode] = useState<Mode>('equal');
  const [customPct, setCustomPct] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const rent = household?.rentAmount ?? 0;

  useEffect(() => {
    const init: Record<string, string> = {};
    members.forEach((m) => { init[m.uid] = String(m.sharePercent); });
    setCustomPct(init);
  }, [members]);

  function equalShares(): { member: HouseholdMember; pct: number; amount: number }[] {
    if (members.length === 0) return [];
    const basePct = Math.floor((100 / members.length) * 100) / 100;
    const baseAmount = Math.floor(rent / members.length);
    const remainder = rent - baseAmount * members.length;
    return members.map((m, i) => {
      const isLast = i === members.length - 1;
      return {
        member: m,
        pct: isLast ? Math.round((100 - basePct * (members.length - 1)) * 10) / 10 : Math.round(basePct * 10) / 10,
        amount: isLast ? baseAmount + remainder : baseAmount,
      };
    });
  }

  async function saveEqualSplit() {
    if (IS_DEMO) { Alert.alert('Demo Mode', 'Shares saved (demo — no data written).'); return; }
    if (!household) return;
    setSaving(true);
    try {
      const shares = equalShares();
      for (const { member, pct, amount } of shares)
        await setMemberShare(household.id, member.uid, member.displayName, member.email, pct, amount);
      updateMemberShares(shares.map(({ member, pct, amount }) => ({ uid: member.uid, sharePercent: pct, shareAmount: amount })));
      Alert.alert('Saved', 'Equal split applied.');
    } catch { Alert.alert('Error', 'Failed to save. Please try again.'); }
    finally { setSaving(false); }
  }

  function pctSum(): number {
    return members.reduce((sum, m) => { const v = parseFloat(customPct[m.uid] ?? '0'); return sum + (isNaN(v) ? 0 : v); }, 0);
  }
  function customAmount(uid: string): number {
    const v = parseFloat(customPct[uid] ?? '0');
    return isNaN(v) ? 0 : Math.round((v / 100) * rent);
  }

  async function saveCustomSplit() {
    if (IS_DEMO) { Alert.alert('Demo Mode', 'Shares saved (demo — no data written).'); return; }
    if (!household) return;
    setSaving(true);
    try {
      for (const m of members)
        await setMemberShare(household.id, m.uid, m.displayName, m.email, parseFloat(customPct[m.uid] ?? '0'), customAmount(m.uid));
      updateMemberShares(members.map((m) => ({ uid: m.uid, sharePercent: parseFloat(customPct[m.uid] ?? '0'), shareAmount: customAmount(m.uid) })));
      Alert.alert('Saved', 'Custom split applied.');
    } catch { Alert.alert('Error', 'Failed to save. Please try again.'); }
    finally { setSaving(false); }
  }

  const sum = pctSum();
  const sumIsHundred = Math.abs(sum - 100) < 0.01;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Split Calculator</Text>
          {IS_DEMO && <DemoBadge />}
        </View>
        <View style={styles.rentCard}>
          <Text style={styles.rentLabel}>Household Rent</Text>
          <Text style={styles.rentAmount}>${rent.toLocaleString()}</Text>
          <Text style={styles.rentSub}>{members.length} member{members.length !== 1 ? 's' : ''}</Text>
        </View>
        <View style={styles.toggle}>
          <TouchableOpacity style={[styles.toggleBtn, mode === 'equal' && styles.toggleBtnActive]} onPress={() => setMode('equal')}>
            <Text style={[styles.toggleText, mode === 'equal' && styles.toggleTextActive]}>Equal Split</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toggleBtn, mode === 'custom' && styles.toggleBtnActive]} onPress={() => setMode('custom')}>
            <Text style={[styles.toggleText, mode === 'custom' && styles.toggleTextActive]}>Custom %</Text>
          </TouchableOpacity>
        </View>

        {mode === 'equal' && (
          <View style={styles.section}>
            {members.length === 0 ? <Text style={styles.emptyText}>No members in household.</Text> : (
              equalShares().map(({ member, pct, amount }) => (
                <View key={member.uid} style={styles.memberRow}>
                  <Text style={styles.memberName}>{member.displayName}</Text>
                  <View style={styles.memberRight}>
                    <Text style={styles.memberPct}>{pct}%</Text>
                    <Text style={styles.memberAmount}>${amount.toLocaleString()}</Text>
                  </View>
                </View>
              ))
            )}
            <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={saveEqualSplit} disabled={saving || members.length === 0}>
              <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Equal Split'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {mode === 'custom' && (
          <View style={styles.section}>
            {members.length === 0 ? <Text style={styles.emptyText}>No members in household.</Text> : (
              <>
                {members.map((m) => (
                  <View key={m.uid} style={styles.memberRow}>
                    <Text style={styles.memberName}>{m.displayName}</Text>
                    <View style={styles.memberRight}>
                      <TextInput
                        style={styles.pctInput}
                        value={customPct[m.uid] ?? ''}
                        onChangeText={(v) => setCustomPct((prev) => ({ ...prev, [m.uid]: v }))}
                        keyboardType="decimal-pad"
                        maxLength={6}
                        placeholder="0"
                        placeholderTextColor={Colors.textMuted}
                        selectTextOnFocus
                      />
                      <Text style={styles.pctSign}>%</Text>
                      <Text style={styles.memberAmount}>${customAmount(m.uid).toLocaleString()}</Text>
                    </View>
                  </View>
                ))}
                <View style={styles.sumRow}>
                  <Text style={styles.sumLabel}>Total</Text>
                  <Text style={[styles.sumValue, sumIsHundred ? styles.sumOk : styles.sumBad]}>{Math.round(sum * 100) / 100}%</Text>
                </View>
                <TouchableOpacity style={[styles.saveBtn, (!sumIsHundred || saving) && styles.saveBtnDisabled]} onPress={saveCustomSplit} disabled={!sumIsHundred || saving}>
                  <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Custom Split'}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 60 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text },
  rentCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: Colors.border },
  rentLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 },
  rentAmount: { fontSize: 36, fontWeight: '800', color: Colors.primary, marginTop: 4 },
  rentSub: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  toggle: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: 20, overflow: 'hidden' },
  toggleBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: Colors.primary },
  toggleText: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  toggleTextActive: { color: Colors.background },
  section: { gap: 10 },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', paddingVertical: 20 },
  memberRow: { backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  memberName: { fontSize: 15, fontWeight: '600', color: Colors.text, flex: 1 },
  memberRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  memberPct: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600', minWidth: 40, textAlign: 'right' },
  memberAmount: { fontSize: 15, fontWeight: '800', color: Colors.primary, minWidth: 64, textAlign: 'right' },
  pctInput: { backgroundColor: Colors.surfaceElevated, color: Colors.text, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 15, fontWeight: '700', width: 56, textAlign: 'right' },
  pctSign: { fontSize: 14, color: Colors.textSecondary, fontWeight: '600' },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, marginTop: 4 },
  sumLabel: { fontSize: 14, color: Colors.textSecondary, fontWeight: '700' },
  sumValue: { fontSize: 16, fontWeight: '800' },
  sumOk: { color: Colors.success },
  sumBad: { color: Colors.danger },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  saveBtnDisabled: { backgroundColor: Colors.textMuted },
  saveBtnText: { fontSize: 15, fontWeight: '800', color: Colors.background },
});
