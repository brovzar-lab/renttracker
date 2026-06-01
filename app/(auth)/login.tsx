import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Colors } from '../../constants/colors';
import { IS_DEMO, DEMO_USER } from '../../constants/demo';
import { auth, db } from '../../lib/firebase';
import { useAuthStore } from '../../store/auth';

export default function LoginScreen() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (IS_DEMO) {
      Alert.alert('Demo Mode', 'Demo mode — not saved');
      setUser({
        uid: DEMO_USER.uid,
        email: DEMO_USER.email,
        displayName: DEMO_USER.displayName,
        isPro: DEMO_USER.isPro,
        notificationsEnabled: DEMO_USER.notificationsEnabled,
        reminderDaysBefore: DEMO_USER.reminderDaysBefore,
        totalStorageBytes: DEMO_USER.totalStorageBytes,
        isAuthenticated: true,
      });
      return;
    }

    if (!auth) return;
    setError(null);
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (db) {
        const snap = await getDoc(doc(db, `users/${cred.user.uid}/profile/${cred.user.uid}`));
        if (snap.exists()) {
          const data = snap.data();
          setUser({
            uid: cred.user.uid,
            email: cred.user.email,
            notificationsEnabled: data.notificationsEnabled ?? false,
            reminderDaysBefore: data.reminderDaysBefore ?? 3,
            totalStorageBytes: data.totalStorageBytes ?? 0,
            isAuthenticated: true,
          });
        }
      }
    } catch (e: unknown) {
      setError(friendlyError((e as { code?: string }).code ?? ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.inner} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Welcome back</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={Colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={Colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {error !== null && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.primaryBtnText}>Log In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(auth)/signup')}
            style={styles.linkBtn}
            accessibilityRole="link"
          >
            <Text style={styles.linkText}>
              No account? <Text style={styles.linkAccent}>Sign up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function friendlyError(code: string): string {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again later.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    default:
      return 'Sign in failed. Please try again.';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flex: 1, padding: 24 },
  back: { marginBottom: 24, minHeight: 44, justifyContent: 'center' },
  backText: { color: Colors.primary, fontSize: 16 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text, marginBottom: 32 },
  form: { gap: 12 },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    color: Colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 52,
  },
  errorText: { color: Colors.danger, fontSize: 13, textAlign: 'center' },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    minHeight: 52,
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  linkBtn: { alignItems: 'center', paddingVertical: 12, minHeight: 44, justifyContent: 'center' },
  linkText: { color: Colors.textSecondary, fontSize: 14 },
  linkAccent: { color: Colors.primary, fontWeight: '600' },
});
