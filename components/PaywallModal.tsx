import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Colors } from '../constants/colors';
import { IS_DEMO } from '../constants/demo';
import { getOfferings, purchasePackage, restorePurchases } from '../lib/revenueCat';
import type { RCPackage } from '../lib/revenueCat';
import { useAuthStore } from '../store/auth';

interface Props {
  visible: boolean;
  onClose: () => void;
  reason?: string;
}

const PRO_FEATURES = [
  '📅 Unlimited payment history',
  '⏰ Custom reminders (7, 3, and 1 day before)',
  '☁️ Cloud backup and sync across devices',
  '📊 Household spending analytics',
];

export default function PaywallModal({ visible, onClose, reason }: Props) {
  const setUser = useAuthStore((s) => s.setUser);
  const [offerings, setOfferings] = useState<RCPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const loadOfferings = async () => {
    if (IS_DEMO) return;
    const pkgs = await getOfferings();
    setOfferings(pkgs);
  };

  const handlePurchase = async (pkg: RCPackage) => {
    setLoading(true);
    try {
      const success = await purchasePackage(pkg);
      if (success) {
        setUser({ isPro: true });
        Alert.alert('Welcome to Premium!', 'You now have access to all Premium features.');
        onClose();
      }
    } catch (e: unknown) {
      Alert.alert('Purchase failed', (e as Error).message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const success = await restorePurchases();
      if (success) {
        setUser({ isPro: true });
        Alert.alert('Restored!', 'Your Pro subscription has been restored.');
        onClose();
      } else {
        Alert.alert('No purchases found', 'No active subscription was found to restore.');
      }
    } catch {
      Alert.alert('Restore failed', 'Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onShow={loadOfferings}
    >
      <View style={styles.container}>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        <Text style={styles.emoji}>💸</Text>
        <Text style={styles.title}>Upgrade to Premium</Text>
        {reason !== undefined && <Text style={styles.reason}>{reason}</Text>}

        <View style={styles.featureList}>
          {PRO_FEATURES.map((f) => (
            <Text key={f} style={styles.featureItem}>
              {f}
            </Text>
          ))}
        </View>

        {IS_DEMO ? (
          <View style={styles.demoNote}>
            <Text style={styles.demoNoteText}>Demo mode — purchases disabled</Text>
          </View>
        ) : offerings.length === 0 ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
        ) : (
          <View style={styles.packages}>
            {offerings.map((pkg) => (
              <TouchableOpacity
                key={pkg.identifier}
                style={styles.packageBtn}
                onPress={() => handlePurchase(pkg)}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <>
                    <Text style={styles.packageLabel}>
                      {pkg.packageType === 'ANNUAL' ? 'Annual' : 'Monthly'}
                    </Text>
                    <Text style={styles.packagePrice}>{pkg.priceString}</Text>
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.restoreBtn}
          onPress={handleRestore}
          disabled={restoring || IS_DEMO}
        >
          <Text style={styles.restoreText}>
            {restoring ? 'Restoring…' : 'Restore purchases'}
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 24,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 20,
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: { color: Colors.textSecondary, fontSize: 20 },
  emoji: { fontSize: 56, marginBottom: 12 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  reason: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  featureList: { width: '100%', gap: 12, marginBottom: 32 },
  featureItem: { fontSize: 16, color: Colors.text, lineHeight: 24 },
  demoNote: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
  },
  demoNoteText: { color: Colors.textSecondary, fontSize: 14 },
  packages: { width: '100%', gap: 12 },
  packageBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 56,
  },
  packageLabel: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  packagePrice: { color: Colors.white, fontSize: 16 },
  restoreBtn: { marginTop: 16, padding: 12, minHeight: 44, justifyContent: 'center' },
  restoreText: { color: Colors.textSecondary, fontSize: 14 },
});
