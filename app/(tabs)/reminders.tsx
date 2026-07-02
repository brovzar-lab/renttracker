import { useState } from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { IS_DEMO, DEMO_REMINDER_SETTINGS } from '../../constants/demo';
import DemoBadge from '../../components/DemoBadge';
import { useLeaseStore } from '../../store/lease';

const ADVANCE_OPTIONS: { days: number; label: string }[] = [
  { days: 7, label: '7 days before due' },
  { days: 3, label: '3 days before due' },
  { days: 1, label: '1 day before due' },
  { days: 0, label: 'On the due date' },
];

export default function RemindersScreen() {
  const lease = useLeaseStore((s) => s.lease);

  const [enabled, setEnabled] = useState(IS_DEMO ? DEMO_REMINDER_SETTINGS.enabled : false);
  const [selectedDays, setSelectedDays] = useState<number[]>(
    IS_DEMO ? DEMO_REMINDER_SETTINGS.daysBeforeDue : [3]
  );

  function handleToggleEnabled(value: boolean) {
    if (IS_DEMO) {
      Alert.alert('Demo Mode', 'Reminder settings are read-only in demo mode.');
      return;
    }
    setEnabled(value);
  }

  function handleToggleDay(days: number) {
    if (IS_DEMO) {
      Alert.alert('Demo Mode', 'Reminder settings are read-only in demo mode.');
      return;
    }
    setSelectedDays((prev) =>
      prev.includes(days) ? prev.filter((d) => d !== days) : [...prev, days].sort((a, b) => b - a)
    );
  }

  const dueDay = lease?.dueDay ?? 1;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Reminders</Text>
          {IS_DEMO && <DemoBadge />}
        </View>

        {/* Main toggle */}
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowLabel}>Rent Reminders</Text>
              <Text style={styles.rowSub}>
                Get notified before the {dueDay}{ordinal(dueDay)} of each month
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={handleToggleEnabled}
              trackColor={{ true: Colors.primary, false: Colors.border }}
              thumbColor={Colors.white}
            />
          </View>
        </View>

        {/* Advance options */}
        {enabled && (
          <>
            <Text style={styles.sectionLabel}>REMIND ME</Text>
            <View style={styles.optionsList}>
              {ADVANCE_OPTIONS.map(({ days, label }) => {
                const checked = selectedDays.includes(days);
                return (
                  <TouchableOpacity
                    key={days}
                    style={[styles.optionRow, checked && styles.optionRowActive]}
                    onPress={() => handleToggleDay(days)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                      {checked && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={[styles.optionLabel, checked && styles.optionLabelActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Status summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Current Settings</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Status</Text>
            <Text style={[styles.summaryValue, { color: enabled ? Colors.success : Colors.textMuted }]}>
              {enabled ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
          {enabled && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Reminders at</Text>
              <Text style={styles.summaryValue}>
                {selectedDays.length > 0
                  ? selectedDays.map((d) => (d === 0 ? 'Due date' : `${d}d before`)).join(', ')
                  : 'None selected'}
              </Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Rent due</Text>
            <Text style={styles.summaryValue}>
              {dueDay}{ordinal(dueDay)} of each month
            </Text>
          </View>
        </View>

        {IS_DEMO && (
          <View style={styles.demoNote}>
            <Text style={styles.demoNoteText}>
              Reminders are pre-configured to 3 days before due in demo mode.
            </Text>
          </View>
        )}
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
  scroll: { padding: 20, paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowInfo: { flex: 1, marginRight: 12 },
  rowLabel: { fontSize: 16, fontWeight: '700', color: Colors.text },
  rowSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, lineHeight: 16 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  optionsList: { gap: 8, marginBottom: 20 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionRowActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '12' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkmark: { color: Colors.white, fontSize: 13, fontWeight: '800' },
  optionLabel: { fontSize: 15, color: Colors.textSecondary, fontWeight: '500' },
  optionLabelActive: { color: Colors.text, fontWeight: '700' },

  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    gap: 10,
    marginBottom: 16,
  },
  summaryTitle: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, marginBottom: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryKey: { fontSize: 14, color: Colors.textSecondary },
  summaryValue: { fontSize: 14, fontWeight: '700', color: Colors.text },

  demoNote: {
    backgroundColor: Colors.accent + '18',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.accent + '44',
  },
  demoNoteText: { color: Colors.accent, fontSize: 13, fontWeight: '500', textAlign: 'center' },
});
