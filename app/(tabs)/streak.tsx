import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { IS_DEMO, DEMO_STREAK_MONTHS, DEMO_STREAK_COUNT } from '../../constants/demo';
import DemoBadge from '../../components/DemoBadge';
import { usePaymentsStore } from '../../store/payments';

// ─── Calendar helpers ─────────────────────────────────────────────────────────

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-US', {
    month: 'short',
  });
}

function yearOf(ym: string): string {
  return ym.split('-')[0];
}

// Group months by year for display
function groupByYear(months: string[]): Record<string, string[]> {
  return months.reduce<Record<string, string[]>>((acc, ym) => {
    const year = yearOf(ym);
    if (!acc[year]) acc[year] = [];
    acc[year].push(ym);
    return acc;
  }, {});
}

// ─── Month Chip ───────────────────────────────────────────────────────────────

function MonthChip({ ym, paid }: { ym: string; paid: boolean }) {
  const today = new Date();
  const currentYm = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const isCurrent = ym === currentYm;
  const isFuture = ym > currentYm;

  let bg = Colors.background;
  let borderColor = Colors.border;
  let textColor = Colors.textMuted;
  let icon = '○';

  if (paid) {
    bg = Colors.success + '22';
    borderColor = Colors.success;
    textColor = Colors.success;
    icon = '✓';
  } else if (isCurrent) {
    bg = Colors.warning + '22';
    borderColor = Colors.warning;
    textColor = Colors.warning;
    icon = '·';
  } else if (!isFuture) {
    bg = Colors.danger + '22';
    borderColor = Colors.danger;
    textColor = Colors.danger;
    icon = '✕';
  }

  return (
    <View style={[chip.container, { backgroundColor: bg, borderColor }]}>
      <Text style={[chip.icon, { color: textColor }]}>{icon}</Text>
      <Text style={[chip.label, { color: textColor }]}>{monthLabel(ym)}</Text>
    </View>
  );
}

const chip = StyleSheet.create({
  container: {
    width: 52,
    height: 56,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  icon: { fontSize: 14, fontWeight: '800' },
  label: { fontSize: 10, fontWeight: '700' },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function StreakScreen() {
  const payments = usePaymentsStore((s) => s.payments);

  const paidMonths = IS_DEMO
    ? DEMO_STREAK_MONTHS
    : payments.map((p) => p.month);

  const streakCount = IS_DEMO
    ? DEMO_STREAK_COUNT
    : paidMonths.length;

  // Build display range: from earliest paid month to current month
  const today = new Date();
  const currentYm = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const allMonths: string[] = [];
  if (IS_DEMO) {
    // Show Aug 2025 – Jul 2026 (12 months window)
    const start = new Date(2025, 7); // Aug 2025
    const end = new Date(2026, 6);   // Jul 2026
    const cur = new Date(start);
    while (cur <= end) {
      allMonths.push(
        `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`
      );
      cur.setMonth(cur.getMonth() + 1);
    }
  } else {
    // Build 12-month trailing window
    const cur = new Date(today.getFullYear(), today.getMonth() - 11);
    for (let i = 0; i < 12; i++) {
      allMonths.push(
        `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`
      );
      cur.setMonth(cur.getMonth() + 1);
    }
  }

  const byYear = groupByYear(allMonths);
  const years = Object.keys(byYear).sort();
  const paidSet = new Set(paidMonths);

  const onTimeCount = IS_DEMO ? DEMO_STREAK_COUNT : paidMonths.length;
  const totalMonths = IS_DEMO
    ? allMonths.filter((m) => m <= currentYm && m >= DEMO_STREAK_MONTHS[0]).length
    : allMonths.filter((m) => m <= currentYm).length;
  const pctOnTime = totalMonths > 0 ? Math.round((onTimeCount / totalMonths) * 100) : 100;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Streak Tracker</Text>
          {IS_DEMO && <DemoBadge />}
        </View>

        {/* Hero stats */}
        <View style={styles.heroCard}>
          <View style={styles.streakBadge}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakCount}>{streakCount}</Text>
            <Text style={styles.streakLabel}>month streak</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.pctBadge}>
            <Text style={styles.pctValue}>{pctOnTime}%</Text>
            <Text style={styles.pctLabel}>on-time record</Text>
            {pctOnTime === 100 && (
              <View style={styles.perfectBadge}>
                <Text style={styles.perfectText}>Perfect</Text>
              </View>
            )}
          </View>
        </View>

        {/* Calendar */}
        {years.map((year) => (
          <View key={year} style={styles.yearBlock}>
            <Text style={styles.yearLabel}>{year}</Text>
            <View style={styles.monthGrid}>
              {byYear[year].map((ym) => (
                <MonthChip key={ym} ym={ym} paid={paidSet.has(ym)} />
              ))}
            </View>
          </View>
        ))}

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
            <Text style={styles.legendText}>Paid on time</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.warning }]} />
            <Text style={styles.legendText}>Current month</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.border }]} />
            <Text style={styles.legendText}>Upcoming</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text },

  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  streakBadge: { alignItems: 'center', gap: 2 },
  streakEmoji: { fontSize: 36 },
  streakCount: { fontSize: 48, fontWeight: '900', color: Colors.text, lineHeight: 52 },
  streakLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  heroDivider: { width: 1, height: 64, backgroundColor: Colors.border },
  pctBadge: { alignItems: 'center', gap: 2 },
  pctValue: { fontSize: 48, fontWeight: '900', color: Colors.success, lineHeight: 52 },
  pctLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  perfectBadge: {
    backgroundColor: Colors.success,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 4,
  },
  perfectText: { color: Colors.white, fontSize: 11, fontWeight: '800' },

  yearBlock: { marginBottom: 20 },
  yearLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: Colors.textSecondary },
});
