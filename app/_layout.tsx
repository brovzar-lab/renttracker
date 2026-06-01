import { useEffect, useState, type ReactNode } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { Colors } from '../constants/colors';
import {
  IS_DEMO,
  type Household,
  type HouseholdMember,
  type Bill,
  type Payment,
} from '../constants/demo';
import { auth, db } from '../lib/firebase';
import { configurePurchases, loginPurchases } from '../lib/revenueCat';
import { useAuthStore } from '../store/auth';
import { useHouseholdStore } from '../store/household';
import { usePaymentsStore } from '../store/payments';

// ─── AuthGate ─────────────────────────────────────────────────────────────────

function AuthGate({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';
    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/welcome');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments]);

  return <>{children}</>;
}

// ─── Root Layout ──────────────────────────────────────────────────────────────

export default function RootLayout() {
  const [initializing, setInitializing] = useState(!IS_DEMO);

  const setUser = useAuthStore((s) => s.setUser);
  const setHousehold = useHouseholdStore((s) => s.setHousehold);
  const setMembers = useHouseholdStore((s) => s.setMembers);
  const setBills = useHouseholdStore((s) => s.setBills);
  const setCurrentBill = useHouseholdStore((s) => s.setCurrentBill);
  const setPayments = usePaymentsStore((s) => s.setPayments);

  // Configure RevenueCat once on mount (live mode only)
  useEffect(() => {
    if (!IS_DEMO) {
      configurePurchases();
    }
  }, []);

  // Firebase Auth listener + Firestore data load
  useEffect(() => {
    if (IS_DEMO || !auth) return;

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && db) {
        try {
          // ── 1. Load user profile ───────────────────────────────────────────
          const profileSnap = await getDoc(doc(db, `users/${firebaseUser.uid}`));
          if (profileSnap.exists()) {
            const data = profileSnap.data();
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName ?? data.displayName ?? null,
              notificationsEnabled: data.notificationsEnabled ?? false,
              reminderDays: data.reminderDays ?? [3],
              isPro: data.isPro ?? false,
              isAuthenticated: true,
            });
          } else {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName ?? null,
              isAuthenticated: true,
            });
          }

          loginPurchases(firebaseUser.uid).catch(console.error);

          // ── 2. Load first household ────────────────────────────────────────
          const householdsSnap = await getDocs(
            collection(db, `users/${firebaseUser.uid}/households`)
          );

          if (!householdsSnap.empty) {
            const firstDoc = householdsSnap.docs[0];
            const householdRef = doc(db, `households/${firstDoc.id}`);
            const householdSnap = await getDoc(householdRef);

            if (householdSnap.exists()) {
              const household = { id: householdSnap.id, ...householdSnap.data() } as Household;
              setHousehold(household);
              setUser({ householdId: household.id });

              // ── 3. Load members subcollection ──────────────────────────────
              const membersSnap = await getDocs(
                collection(db, `households/${household.id}/members`)
              );
              const members: HouseholdMember[] = membersSnap.docs.map(
                (d) => ({ uid: d.id, ...d.data() } as HouseholdMember)
              );
              setMembers(members);

              // ── 4. Load bills subcollection ────────────────────────────────
              const billsSnap = await getDocs(
                collection(db, `households/${household.id}/bills`)
              );
              const bills: Bill[] = billsSnap.docs.map(
                (d) => ({ id: d.id, ...d.data() } as Bill)
              );
              setBills(bills);

              // Set current bill as the most recent one
              if (bills.length > 0) {
                const sorted = [...bills].sort((a, b) => b.month.localeCompare(a.month));
                setCurrentBill(sorted[0]);
              }

              // ── 5. Load payments subcollection ─────────────────────────────
              const paymentsSnap = await getDocs(
                collection(db, `households/${household.id}/payments`)
              );
              const payments = paymentsSnap.docs.map(
                (d) => ({ id: d.id, ...d.data() } as Payment
              ));
              setPayments(payments as Parameters<typeof setPayments>[0]);
            }
          }
        } catch (e) {
          console.error('[RootLayout] data load error:', e);
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName ?? null,
            isAuthenticated: true,
          });
        }
      } else {
        setUser({ uid: null, email: null, isAuthenticated: false });
        setHousehold(null);
        setMembers([]);
        setBills([]);
        setCurrentBill(null);
        setPayments([]);
      }

      setInitializing(false);
    });

    return unsub;
  }, []);

  if (initializing) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: Colors.background,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AuthGate>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </AuthGate>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
