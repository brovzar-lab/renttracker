import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import {
  IS_DEMO,
  DEMO_USER,
  DEMO_HOUSEHOLD,
  DEMO_MEMBERS,
  DEMO_BILLS,
  DEMO_CURRENT_BILL,
  DEMO_PAYMENTS,
} from '../../constants/demo';
import { useAuthStore } from '../../store/auth';
import { useHouseholdStore } from '../../store/household';
import { usePaymentsStore } from '../../store/payments';

export default function WelcomeScreen() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const setHousehold = useHouseholdStore((s) => s.setHousehold);
  const setMembers = useHouseholdStore((s) => s.setMembers);
  const setBills = useHouseholdStore((s) => s.setBills);
  const setCurrentBill = useHouseholdStore((s) => s.setCurrentBill);
  const setPayments = usePaymentsStore((s) => s.setPayments);

  const handleDemo = () => {
    setUser({
      uid: DEMO_USER.uid,
      email: DEMO_USER.email,
      displayName: DEMO_USER.displayName,
      isPro: DEMO_USER.isPro,
      notificationsEnabled: DEMO_USER.notificationsEnabled,
      reminderDays: DEMO_USER.reminderDays,
      householdId: DEMO_HOUSEHOLD.id,
      isAuthenticated: true,
    });
    setHousehold(DEMO_HOUSEHOLD);
    setMembers(DEMO_MEMBERS);
    setBills(DEMO_BILLS);
    setCurrentBill(DEMO_CURRENT_BILL);
    setPayments(DEMO_PAYMENTS as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.logo}>🏠</Text>
        <Text style={styles.appName}>RentTracker</Text>
        <Text style={styles.tagline}>Split rent with roommates. Pay on time. Stay stress-free.</Text>
      </View>

      <View style={styles.actions}>
        {IS_DEMO && (
          <TouchableOpacity style={styles.demoBtn} onPress={handleDemo}>
            <Text style={styles.demoBtnText}>Continue as Demo User</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(auth)/signup')}>
          <Text style={styles.primaryBtnText}>Create Account</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.secondaryBtnText}>Log In</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, justifyContent: 'space-between', padding: 24 },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  logo: { fontSize: 72 },
  appName: { fontSize: 36, fontWeight: '800', color: Colors.text },
  tagline: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24, paddingHorizontal: 16 },
  actions: { gap: 12, paddingBottom: 16 },
  demoBtn: { borderWidth: 1, borderColor: Colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  demoBtnText: { color: Colors.primary, fontWeight: '600', fontSize: 16 },
  primaryBtn: { backgroundColor: Colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryBtnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  secondaryBtn: { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, alignItems: 'center' },
  secondaryBtnText: { color: Colors.text, fontWeight: '600', fontSize: 16 },
});
