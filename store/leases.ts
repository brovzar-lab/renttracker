import { create } from 'zustand';
import { DEMO_LEASES, IS_DEMO } from '../constants/demo';

export interface LeaseDocument {
  id: string;
  filename: string;
  url: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface Lease {
  id: string;
  address: string;
  landlordName: string;
  landlordContact: string;
  monthlyRent: number;
  leaseStart: string;
  leaseEnd: string | null;
  totalStorageBytes: number;
  createdAt: string;
  documents: LeaseDocument[];
}

interface LeasesState {
  leases: Lease[];
  setLeases: (leases: Lease[]) => void;
  addLease: (lease: Omit<Lease, 'id' | 'createdAt' | 'documents' | 'totalStorageBytes'>) => Lease;
  deleteLease: (leaseId: string) => void;
  addDocument: (leaseId: string, doc: LeaseDocument) => void;
  deleteDocument: (leaseId: string, docId: string) => void;
}

export const useLeasesStore = create<LeasesState>((set, get) => ({
  leases: IS_DEMO ? (DEMO_LEASES as Lease[]) : [],

  setLeases: (leases) => set({ leases }),

  addLease: (lease) => {
    const newLease: Lease = {
      ...lease,
      id: `lease-${Date.now()}`,
      totalStorageBytes: 0,
      createdAt: new Date().toISOString(),
      documents: [],
    };
    set((s) => ({ leases: [newLease, ...s.leases] }));
    return newLease;
  },

  deleteLease: (leaseId) =>
    set((s) => ({ leases: s.leases.filter((l) => l.id !== leaseId) })),

  addDocument: (leaseId, doc) =>
    set((s) => ({
      leases: s.leases.map((l) =>
        l.id === leaseId
          ? {
              ...l,
              documents: [...l.documents, doc],
              totalStorageBytes: l.totalStorageBytes + doc.sizeBytes,
            }
          : l
      ),
    })),

  deleteDocument: (leaseId, docId) =>
    set((s) => ({
      leases: s.leases.map((l) => {
        if (l.id !== leaseId) return l;
        const doc = l.documents.find((d) => d.id === docId);
        return {
          ...l,
          documents: l.documents.filter((d) => d.id !== docId),
          totalStorageBytes: l.totalStorageBytes - (doc?.sizeBytes ?? 0),
        };
      }),
    })),
}));

export function getActiveLease(leases: Lease[]): Lease | undefined {
  const today = new Date();
  return leases.find((l) => {
    if (!l.leaseEnd) return true;
    return new Date(l.leaseEnd) >= today;
  });
}
