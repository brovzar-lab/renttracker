import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_TOTAL_BYTES = 500 * 1024 * 1024; // 500MB

export { MAX_FILE_BYTES, MAX_TOTAL_BYTES };

export async function uploadReceipt(
  uid: string,
  paymentId: string,
  filename: string,
  uri: string
): Promise<string> {
  if (!storage) throw new Error('Storage not initialized');
  const response = await fetch(uri);
  const blob = await response.blob();
  if (blob.size > MAX_FILE_BYTES) throw new Error('File exceeds 10MB limit');

  const storageRef = ref(storage, `users/${uid}/receipts/${paymentId}/${filename}`);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

export async function uploadLeaseDocument(
  uid: string,
  leaseId: string,
  filename: string,
  uri: string,
  totalStorageBytes: number
): Promise<{ url: string; sizeBytes: number }> {
  if (!storage) throw new Error('Storage not initialized');
  const response = await fetch(uri);
  const blob = await response.blob();
  if (blob.size > MAX_FILE_BYTES) throw new Error('File exceeds 10MB limit');
  if (totalStorageBytes + blob.size > MAX_TOTAL_BYTES) throw new Error('Storage limit reached (500MB)');

  const storageRef = ref(storage, `users/${uid}/leases/${leaseId}/documents/${filename}`);
  await uploadBytes(storageRef, blob);
  const url = await getDownloadURL(storageRef);
  return { url, sizeBytes: blob.size };
}

export async function deleteStorageFile(path: string): Promise<void> {
  if (!storage) return;
  try {
    await deleteObject(ref(storage, path));
  } catch {
    // Ignore not-found errors
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
