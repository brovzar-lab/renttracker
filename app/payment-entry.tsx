import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../constants/colors';
import { IS_DEMO } from '../constants/demo';
import { useAuthStore } from '../store/auth';
import { useLeasesStore } from '../store/leases';
import { usePaymentsStore } from '../store/payments';
import type { PaymentStatus } from '../store/payments';
import { savePayment } from '../lib/firestore';
import { uploadReceipt } from '../lib/storage';

interface FormState {
  amount: string;
  date: string;
  status: PaymentStatus;
  notes: string;
  leaseId: string;
}

const STATUS_OPTIONS: { value: PaymentStatus; label: string; color: string }[] = [
  { value: 'paid', label: 'Paid', color: Colors.paid },
  { value: 'pending', label: 'Pending', color: Colors.pending },
  { value: 'late', label: 'Late', color: Colors.late },
];

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export default function PaymentEntryScreen() {
  const router = useRouter();
  const uid = useAuthStore((s) => s.uid);
  const leases = useLeasesStore((s) => s.leases);
  const { addPayment } = usePaymentsStore();

  const firstLease = leases[0];
  const [form, setForm] = useState<FormState>({
    amount: firstLease ? String(firstLease.monthlyRent) : '',
    date: todayISO(),
    status: 'paid',
    notes: '',
    leaseId: firstLease?.id ?? '',
  });
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const pickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      setReceiptUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Camera access is needed to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      setReceiptUri(result.assets[0].uri);
    }
  };

  const handlePickReceipt = () => {
    if (IS_DEMO) {
      Alert.alert('Demo mode', 'Demo mode — not saved');
      return;
    }
    Alert.alert('Receipt Photo', 'Add receipt from', [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Library', onPress: pickFromLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      setFormError('Enter a valid amount.');
      return;
    }
    if (!form.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      setFormError('Date must be YYYY-MM-DD format.');
      return;
    }

    if (IS_DEMO) {
      Alert.alert('Demo mode', 'Demo mode — not saved');
      addPayment({
        amount,
        date: form.date,
        status: form.status,
        notes: form.notes.trim(),
        receiptUrl: null,
        leaseId: form.leaseId || null,
      });
      router.back();
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      let receiptUrl: string | null = null;
      const tempId = `pay-${Date.now()}`;

      if (receiptUri !== null && uid) {
        const filename = `receipt_${tempId}.jpg`;
        receiptUrl = await uploadReceipt(uid, tempId, filename, receiptUri);
      }

      const id = await savePayment(uid!, {
        amount,
        date: form.date,
        status: form.status,
        notes: form.notes.trim(),
        receiptUrl,
        leaseId: form.leaseId || null,
      });

      addPayment({
        amount,
        date: form.date,
        status: form.status,
        notes: form.notes.trim(),
        receiptUrl,
        leaseId: form.leaseId || null,
      });
      console.log('[PaymentEntry] saved', id);
      router.back();
    } catch (e: unknown) {
      setFormError((e as Error).message ?? 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {formError !== null && <Text style={styles.formError}>{formError}</Text>}

      <Text style={styles.fieldLabel}>Amount *</Text>
      <TextInput
        style={styles.input}
        placeholder="2500"
        placeholderTextColor={Colors.textMuted}
        value={form.amount}
        onChangeText={(v) => setForm((f) => ({ ...f, amount: v }))}
        keyboardType="decimal-pad"
      />

      <Text style={styles.fieldLabel}>Date *</Text>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={Colors.textMuted}
        value={form.date}
        onChangeText={(v) => setForm((f) => ({ ...f, date: v }))}
      />

      <Text style={styles.fieldLabel}>Status</Text>
      <View style={styles.statusRow}>
        {STATUS_OPTIONS.map((s) => (
          <TouchableOpacity
            key={s.value}
            style={[
              styles.statusOption,
              form.status === s.value && { backgroundColor: s.color + '22', borderColor: s.color },
            ]}
            onPress={() => setForm((f) => ({ ...f, status: s.value }))}
          >
            <Text style={[styles.statusOptionText, form.status === s.value && { color: s.color }]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {leases.length > 0 && (
        <>
          <Text style={styles.fieldLabel}>Lease</Text>
          <View style={styles.leaseSelector}>
            <TouchableOpacity
              style={[styles.leaseOption, form.leaseId === '' && styles.leaseOptionActive]}
              onPress={() => setForm((f) => ({ ...f, leaseId: '' }))}
            >
              <Text style={[styles.leaseOptionText, form.leaseId === '' && styles.leaseOptionTextActive]}>
                None
              </Text>
            </TouchableOpacity>
            {leases.map((l) => (
              <TouchableOpacity
                key={l.id}
                style={[styles.leaseOption, form.leaseId === l.id && styles.leaseOptionActive]}
                onPress={() => setForm((f) => ({ ...f, leaseId: l.id }))}
              >
                <Text
                  style={[styles.leaseOptionText, form.leaseId === l.id && styles.leaseOptionTextActive]}
                  numberOfLines={1}
                >
                  {l.address.split(',')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <Text style={styles.fieldLabel}>Notes</Text>
      <TextInput
        style={[styles.input, styles.notesInput]}
        placeholder="Optional note"
        placeholderTextColor={Colors.textMuted}
        value={form.notes}
        onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
        multiline
        numberOfLines={3}
      />

      <Text style={styles.fieldLabel}>Receipt Photo (optional)</Text>
      <TouchableOpacity style={styles.receiptPicker} onPress={handlePickReceipt}>
        {receiptUri !== null ? (
          <Image source={{ uri: receiptUri }} style={styles.receiptPreview} />
        ) : (
          <Text style={styles.receiptPickerText}>📷 Choose from library</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <Text style={styles.saveBtnText}>Save Payment</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 60 },
  formError: { color: Colors.danger, fontSize: 13, marginBottom: 12 },
  fieldLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600', marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    color: Colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 48,
  },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  statusRow: { flexDirection: 'row', gap: 10 },
  statusOption: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusOptionText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  leaseSelector: { gap: 8 },
  leaseOption: {
    borderRadius: 10,
    padding: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  leaseOptionActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  leaseOptionText: { fontSize: 14, color: Colors.textSecondary },
  leaseOptionTextActive: { color: Colors.primary, fontWeight: '600' },
  receiptPicker: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  receiptPickerText: { color: Colors.textMuted, fontSize: 14 },
  receiptPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 32,
    minHeight: 52,
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
});
