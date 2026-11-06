import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { BookCopy, CopyStatus } from '../types';
import type { BookCopyFormData } from '../schemas';

const COLLECTION = 'bookCopies';

function docToCopy(snap: QueryDocumentSnapshot<DocumentData>): BookCopy {
  return { id: snap.id, ...snap.data() } as BookCopy;
}

export const copyService = {
  async getById(id: string): Promise<BookCopy | null> {
    const snap = await getDoc(doc(db, COLLECTION, id));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as BookCopy) : null;
  },

  async getByBook(bookId: string): Promise<BookCopy[]> {
    const q = query(
      collection(db, COLLECTION),
      where('bookId', '==', bookId),
      orderBy('accessionNumber')
    );
    const snaps = await getDocs(q);
    return snaps.docs.map(docToCopy);
  },

  async getByStatus(status: CopyStatus): Promise<BookCopy[]> {
    const q = query(
      collection(db, COLLECTION),
      where('status', '==', status),
      orderBy('accessionNumber')
    );
    const snaps = await getDocs(q);
    return snaps.docs.map(docToCopy);
  },

  async getByAccession(accessionNumber: string): Promise<BookCopy | null> {
    const q = query(
      collection(db, COLLECTION),
      where('accessionNumber', '==', accessionNumber)
    );
    const snaps = await getDocs(q);
    if (snaps.empty) return null;
    return docToCopy(snaps.docs[0]);
  },

  async create(data: BookCopyFormData): Promise<string> {
    // Check for duplicate accession number
    const existing = await this.getByAccession(data.accessionNumber);
    if (existing) throw new Error(`Accession number ${data.accessionNumber} already exists.`);

    const ref = await addDoc(collection(db, COLLECTION), {
      bookId: data.bookId,
      accessionNumber: data.accessionNumber.toUpperCase(),
      rackId: data.rackId.toUpperCase(),
      rowNumber: data.rowNumber,
      shelfId: data.shelfId.toUpperCase(),
      status: data.status,
      condition: data.condition ?? '',
      notes: data.notes ?? '',
      currentLoanId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  },

  async update(id: string, data: Partial<BookCopyFormData>): Promise<void> {
    const updates: Record<string, unknown> = { updatedAt: serverTimestamp() };
    const fields = ['accessionNumber', 'rackId', 'rowNumber', 'shelfId', 'status', 'condition', 'notes'] as const;
    for (const field of fields) {
      if (data[field] !== undefined) {
        if (field === 'accessionNumber' || field === 'rackId' || field === 'shelfId') {
          updates[field] = (data[field] as string).toUpperCase();
        } else {
          updates[field] = data[field];
        }
      }
    }
    await updateDoc(doc(db, COLLECTION, id), updates);
  },

  async updateStatus(id: string, status: CopyStatus, currentLoanId?: string | null): Promise<void> {
    await updateDoc(doc(db, COLLECTION, id), {
      status,
      currentLoanId: currentLoanId ?? null,
      updatedAt: serverTimestamp(),
    });
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id));
  },

  async getAll(): Promise<BookCopy[]> {
    const q = query(collection(db, COLLECTION), orderBy('accessionNumber'));
    const snaps = await getDocs(q);
    return snaps.docs.map(docToCopy);
  },

  async countByBook(bookId: string): Promise<{ total: number; available: number }> {
    const copies = await this.getByBook(bookId);
    const available = copies.filter((c) => c.status === 'available').length;
    return { total: copies.length, available };
  },
};
