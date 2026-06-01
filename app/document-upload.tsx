import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Colors } from '../constants/colors';
import { IS_DEMO } from '../constants/demo';
import { useAuthStore } from '../store/auth';
import { useLeasesStore } from '../store/leases';
import { addLeaseDocument } from '../lib/firestore';
import { uploadLeaseDocument, formatBytes, MAX_FILE_BYTES, MAX_TOTAL_BYTES } from '../lib/storage';

export default function DocumentUploadScreen() {
  const router = useRouter();
  const { leaseId } = useLocalSearchParams<{ leaseId: string }>();
  const uid = useAuthStore((s) => s.uid);
  const totalStorageBytes = useAuthStore((s) => s.totalStorageBytes);
  const { leases, addDocument } = useLeasesStore();

  const lease = leases.find((l) => l.id === leaseId);
  const [pickedFile, setPickedFile] = useState<{ name: string; uri: string; size: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remainingBytes = MAX_TOTAL_BYTES - totalStorageBytes;

  const handlePickFile = async () => {
    setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      const size = asset.size ?? 0;

      if (size > MAX_FILE_BYTES) {
        setError('File exceeds 10MB limit.');
        return;
      }
      if (size > remainingBytes) {
        setError(`Not enough storage. You have ${formatBytes(remainingBytes)} remaining.`);
        return;
      }

      setPickedFile({ name: asset.name, uri: asset.uri, size });
    } catch (e) {
      setError('Could not pick file. Please try again.');
    }
  };

  const handleUpload = async () => {
    if (!pickedFile) return;

    if (IS_DEMO) {
      Alert.alert('Demo mode', 'Demo mode — not saved');
      addDocument(leaseId!, {
        id: `doc-${Date.now()}`,
        filename: pickedFile.name,
        url: 'https://example.com/demo/uploaded.pdf',
        sizeBytes: pickedFile.size,
        uploadedAt: new Date().toISOString(),
      });
      router.back();
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const { url, sizeBytes } = await uploadLeaseDocument(
        uid!,
        leaseId!,
        pickedFile.name,
        pickedFile.uri,
        totalStorageBytes
      );
      const docId = await addLeaseDocument(uid!, leaseId!, {
        filename: pickedFile.name,
        url,
        sizeBytes,
      });
      addDocument(leaseId!, {
        id: docId,
        filename: pickedFile.name,
        url,
        sizeBytes,
        uploadedAt: new Date().toISOString(),
      });
      router.back();
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {lease && (
        <View style={styles.leaseInfo}>
          <Text style={styles.leaseLabel}>Uploading to</Text>
          <Text style={styles.leaseAddress} numberOfLines={2}>{lease.address}</Text>
        </View>
      )}

      {/* Storage indicator */}
      <View style={styles.storageCard}>
        <Text style={styles.storageTitle}>Storage</Text>
        <View style={styles.storageBar}>
          <View
            style={[
              styles.storageBarFill,
              { width: `${Math.min(100, (totalStorageBytes / MAX_TOTAL_BYTES) * 100)}%` as `${number}%` },
            ]}
          />
        </View>
        <Text style={styles.storageText}>
          {formatBytes(remainingBytes)} remaining of {formatBytes(MAX_TOTAL_BYTES)}
        </Text>
      </View>

      {error !== null && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* File picker */}
      <TouchableOpacity style={styles.pickBtn} onPress={handlePickFile}>
        <Text style={styles.pickBtnIcon}>📄</Text>
        <Text style={styles.pickBtnText}>
          {pickedFile !== null ? pickedFile.name : 'Choose PDF (max 10MB)'}
        </Text>
        {pickedFile !== null && (
          <Text style={styles.pickedSize}>{formatBytes(pickedFile.size)}</Text>
        )}
      </TouchableOpacity>

      <View style={styles.limits}>
        <Text style={styles.limitText}>• PDF files only</Text>
        <Text style={styles.limitText}>• Max 10MB per file</Text>
        <Text style={styles.limitText}>• Max 500MB total storage</Text>
      </View>

      <TouchableOpacity
        style={[styles.uploadBtn, (pickedFile === null || uploading) && styles.uploadBtnDisabled]}
        onPress={handleUpload}
        disabled={pickedFile === null || uploading}
      >
        {uploading ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <Text style={styles.uploadBtnText}>Upload Document</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 60 },
  leaseInfo: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 4,
  },
  leaseLabel: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  leaseAddress: { fontSize: 14, color: Colors.text, fontWeight: '600' },
  storageCard: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, marginBottom: 16 },
  storageTitle: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  storageBar: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  storageBarFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  storageText: { fontSize: 12, color: Colors.textMuted },
  errorCard: {
    backgroundColor: Colors.danger + '1a',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.danger + '44',
  },
  errorText: { color: Colors.danger, fontSize: 13 },
  pickBtn: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    gap: 8,
    marginBottom: 16,
  },
  pickBtnIcon: { fontSize: 32 },
  pickBtnText: { color: Colors.text, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  pickedSize: { color: Colors.textSecondary, fontSize: 12 },
  limits: { gap: 4, marginBottom: 24 },
  limitText: { color: Colors.textMuted, fontSize: 12 },
  uploadBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  uploadBtnDisabled: { opacity: 0.4 },
  uploadBtnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
});
