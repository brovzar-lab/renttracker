import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { IS_DEMO, DEMO_USER, DEMO_LEASE } from '../../constants/demo';
import { useAuthStore } from '../../store/auth';
import { useLeaseStore } from '../../store/lease';

export default function WelcomeScreen() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const setLease = useLeaseStore((s) => s.setLease);

  const handleDemo = () => {
    setUser({
      uid: DEMO_USER.uid,
      email: DEMO_USER.email,
      displayName: DEMO_USER.displayName,
      isPro: DEMO_USER.isPro,
      leaseId: DEMO_USER.leaseId,
      isAuthenticated: true,
    });
    setLease(DEMO_LEASE);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.logo}>🏠</Text>
        <Text style={styles.appName}>RentTracker</Text>
        <Text style={styles.tagline}>
          Track rent payments. Never miss a due date. Build your record.
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.demoBtn} onPress={handleDemo}>
          <Text style={styles.demoBtnText}>Continue as Demo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push('/(auth)/signup')}
        >
          <Text style={styles.primaryBtnText}>Create Account</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.secondaryBtnText}>Log In</Text>
        </TouchableOpacity>
        {IS_DEMO && (
          <Text style={styles.demoHint}>Demo shows Jordan Martinez's rental data</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'space-between',
    padding: 24,
  },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  logo: { fontSize: 72 },
  appName: { fontSize: 36, fontWeight: '800', color: Colors.text },
  tagline: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  actions: { gap: 12, paddingBottom: 16 },
  demoBtn: {
    borderWidth: 2,
    borderColor: Colors.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    backgroundColor: Colors.accent + '18',
  },
  demoBtnText: { color: Colors.accent, fontWeight: '700', fontSize: 16 },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  primaryBtnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  secondaryBtnText: { color: Colors.text, fontWeight: '600', fontSize: 16 },
  demoHint: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
});
