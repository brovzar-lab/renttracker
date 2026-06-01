import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signOut } from 'firebase/auth';
import { Colors } from '../../constants/colors';
import { IS_DEMO } from '../../constants/demo';
import DemoBadge from '../../components/DemoBadge';
import PaywallModal from '../../components/PaywallModal';
import { useAuthStore } from '../../store/auth';
import { auth } from '../../lib/firebase';
import { updateUserReminderDays } from '../../lib/firestore';

const AVATAR_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'] as const;
const REMINDER_OPTIONS = [7, 3, 1] as const;

function getAvatarColor(uid: string): string {
  return AVATAR_COLORS[uid.charCodeAt(0) % AVATAR_COLORS.length];
}

export default function ProfileScreen() {
  const {
    uid,
    email,
    displayName,
    isPro,
    notificationsEnabled,
    reminderDays,
    setUser,
    signOut: storeSignOut,
  } = useAuthStore();

  const [showPaywall, setShowPaywall] = useState(false);

  const avatarLetter = (displayName ?? email ?? '?')[0].toUpperCase();
  const avatarColor = getAvatarColor(uid ?? 'default');

  const handleToggleNotifications = (value: boolean) => {
    if (IS_DEMO) {
      Alert.alert('Demo Mode', 'Notifications are disabled in demo mode.');
      return;
    }
    setUser({ notificationsEnabled: value });
    if (uid) {
      updateUserReminderDays(uid, value ? reminderDays : []).catch((e: unknown) =>
        console.error('[Profile] reminder update error:', e)
      );
    }
  };

  const handleToggleReminderDay = async (day: 7 | 3 | 1) => {
    if (IS_DEMO) {
      Alert.alert('Demo Mode', 'Reminder days are disabled in demo mode.');
      return;
    }
    const next = reminderDays.includes(day)
      ? reminderDays.filter((d) => d !== day)
      : [...reminderDays, day].sort((a, b) => b - a);
    setUser({ reminderDays: next });
    if (uid) {
      await updateUserReminderDays(uid, next);
    }
  };

  const handleSignOut = () => {
    if (IS_DEMO) {
      storeSignOut();
      return;
    }
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          if (auth) await signOut(auth);
          storeSignOut();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {IS_DEMO && (
          <View style={styles.demoBadgeRow}>
            <DemoBadge />
          </View>
        )}

        {/* Avatar + identity */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarLetter}>{avatarLetter}</Text>
          </View>
          <Text style={styles.displayName}>{displayName ?? 'Renter'}</Text>
          <Text style={styles.email}>{email ?? ''}</Text>
        </View>

        {/* Rent Reminders */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rent Reminders</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Enable Notifications</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ true: Colors.primary, false: Colors.border }}
              thumbColor={Colors.white}
            />
          </View>
          {notificationsEnabled && (
            <View style={styles.checkboxGroup}>
              {REMINDER_OPTIONS.map((day) => {
                const checked = reminderDays.includes(day);
                return (
                  <TouchableOpacity
                    key={day}
                    style={styles.checkboxRow}
                    onPress={() => handleToggleReminderDay(day)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                      {checked && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.checkboxLabel}>{day} days before due</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Membership */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Membership</Text>
          {isPro ? (
            <Text style={styles.proLabel}>RentTracker Premium</Text>
          ) : (
            <View style={styles.freeRow}>
              <Text style={styles.rowLabel}>Free Plan</Text>
              <TouchableOpacity style={styles.upgradeBtn} onPress={() => setShowPaywall(true)}>
                <Text style={styles.upgradeBtnText}>Upgrade to Premium — $2.99/mo</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>RentTracker v1.0.0</Text>
      </ScrollView>

      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 60 },
  demoBadgeRow: { alignItems: 'flex-start', marginBottom: 16 },

  // Avatar
  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarLetter: { fontSize: 32, fontWeight: '800', color: Colors.white },
  displayName: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  email: { fontSize: 13, color: Colors.textSecondary },

  // Section card
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  rowLabel: { fontSize: 15, color: Colors.text, fontWeight: '500' },

  // Checkboxes
  checkboxGroup: { marginTop: 12, gap: 10 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
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
  checkboxLabel: { fontSize: 14, color: Colors.text },

  // Membership
  proLabel: { fontSize: 15, color: Colors.success, fontWeight: '700' },
  freeRow: { gap: 10 },
  upgradeBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  upgradeBtnText: { color: Colors.white, fontSize: 14, fontWeight: '700' },

  // Sign out
  signOutBtn: {
    backgroundColor: Colors.danger + '1a',
    borderWidth: 1,
    borderColor: Colors.danger + '33',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  signOutText: { color: Colors.danger, fontSize: 15, fontWeight: '600' },

  // Footer
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 8,
  },
});
