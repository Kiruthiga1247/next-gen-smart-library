import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  runTransaction,
  type QueryDocumentSnapshot,
  type DocumentData,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Loan, LoanStatus } from '../types';
import { auditService } from './auditService';

const COLLECTION = 'loans';

function docToLoan(snap: QueryDocumentSnapshot<DocumentData>): Loan {
  return { id: snap.id, ...snap.data() } as Loan;
}

export const loanService = {
  async getById(id: string): Promise<Loan | null> {
    const snap = await getDoc(doc(db, COLLECTION, id));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Loan) : null;
  },

  async getByStudent(studentId: string): Promise<Loan[]> {
    const q = query(
      collection(db, COLLECTION),
      where('studentId', '==', studentId),
      orderBy('issuedAt', 'desc')
    );
    const snaps = await getDocs(q);
    return snaps.docs.map(docToLoan);
  },

  async getActiveByStudent(studentId: string): Promise<Loan[]> {
    const q = query(
      collection(db, COLLECTION),
      where('studentId', '==', studentId),
      where('status', 'in', ['active', 'overdue']),
      orderBy('issuedAt', 'desc')
    );
    const snaps = await getDocs(q);
    return snaps.docs.map(docToLoan);
  },

  async getActiveByCopy(copyId: string): Promise<Loan | null> {
    const q = query(
      collection(db, COLLECTION),
      where('copyId', '==', copyId),
      where('status', 'in', ['active', 'overdue'])
    );
    const snaps = await getDocs(q);
    if (snaps.empty) return null;
    return docToLoan(snaps.docs[0]);
  },

  async getAllActive(): Promise<Loan[]> {
    const q = query(
      collection(db, COLLECTION),
      where('status', 'in', ['active', 'overdue']),
      orderBy('dueAt', 'asc')
    );
    const snaps = await getDocs(q);
    return snaps.docs.map(docToLoan);
  },

  async getAll(): Promise<Loan[]> {
    const q = query(collection(db, COLLECTION), orderBy('issuedAt', 'desc'));
    const snaps = await getDocs(q);
    return snaps.docs.map(docToLoan);
  },

  /**
   * Issue a book copy to a student.
   * Uses a Firestore transaction to atomically:
   * 1. Verify the copy is still available
   * 2. Create the loan document
   * 3. Update the copy status to 'borrowed'
   * 4. Update book availableCopies count
   */
  async issue(params: {
    copyId: string;
    bookId: string;
    studentId: string;
    studentName: string;
    studentEmail: string;
    bookTitle: string;
    accessionNumber: string;
    issuedBy: string;
    dueDays?: number;
    reservationId?: string;
  }): Promise<string> {
    const dueDays = params.dueDays ?? 14;
    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + dueDays);

    const loanId = await runTransaction(db, async (tx) => {
      const copyRef = doc(db, 'bookCopies', params.copyId);
      const bookRef = doc(db, 'books', params.bookId);

      const copySnap = await tx.get(copyRef);
      if (!copySnap.exists()) throw new Error('Copy not found.');
      if (copySnap.data().status !== 'available' && copySnap.data().status !== 'reserved') {
        throw new Error(`Copy ${params.accessionNumber} is currently ${copySnap.data().status as string}. Cannot issue.`);
      }

      const bookSnap = await tx.get(bookRef);
      if (!bookSnap.exists()) throw new Error('Book not found.');

      const loanRef = doc(collection(db, COLLECTION));
      tx.set(loanRef, {
        studentId: params.studentId,
        studentName: params.studentName,
        studentEmail: params.studentEmail,
        copyId: params.copyId,
        bookId: params.bookId,
        bookTitle: params.bookTitle,
        accessionNumber: params.accessionNumber,
        issuedBy: params.issuedBy,
        issuedAt: serverTimestamp(),
        dueAt: Timestamp.fromDate(dueAt),
        returnedAt: null,
        status: 'active' as LoanStatus,
        reservationId: params.reservationId ?? null,
      });

      tx.update(copyRef, {
        status: 'borrowed',
        currentLoanId: loanRef.id,
        updatedAt: serverTimestamp(),
      });

      const currentAvailable = (bookSnap.data().availableCopies as number) - 1;
      tx.update(bookRef, {
        availableCopies: Math.max(0, currentAvailable),
        updatedAt: serverTimestamp(),
      });

      return loanRef.id;
    });

    await auditService.log({
      actorId: params.issuedBy,
      actorName: params.issuedBy,
      action: 'loan.issued',
      targetType: 'loan',
      targetId: loanId,
      details: { copyId: params.copyId, studentId: params.studentId, bookTitle: params.bookTitle },
    });

    return loanId;
  },

  /**
   * Return a book copy.
   * Atomically updates loan status, copy status, and book available count.
   */
  async return(params: { loanId: string; returnedBy: string }): Promise<void> {
    await runTransaction(db, async (tx) => {
      const loanRef = doc(db, COLLECTION, params.loanId);
      const loanSnap = await tx.get(loanRef);
      if (!loanSnap.exists()) throw new Error('Loan not found.');
      if (loanSnap.data().status === 'returned') throw new Error('This loan has already been returned.');

      const loanData = loanSnap.data() as Loan;
      const copyRef = doc(db, 'bookCopies', loanData.copyId);
      const bookRef = doc(db, 'books', loanData.bookId);

      const bookSnap = await tx.get(bookRef);
      const currentAvailable = bookSnap.exists()
        ? (bookSnap.data().availableCopies as number) + 1
        : 1;

      tx.update(loanRef, {
        status: 'returned' as LoanStatus,
        returnedAt: serverTimestamp(),
        returnedBy: params.returnedBy,
      });

      tx.update(copyRef, {
        status: 'available',
        currentLoanId: null,
        updatedAt: serverTimestamp(),
      });

      tx.update(bookRef, {
        availableCopies: currentAvailable,
        updatedAt: serverTimestamp(),
      });
    });

    await auditService.log({
      actorId: params.returnedBy,
      actorName: params.returnedBy,
      action: 'loan.returned',
      targetType: 'loan',
      targetId: params.loanId,
    });
  },

  async updateOverdueStatuses(): Promise<number> {
    const now = Timestamp.now();
    const q = query(
      collection(db, COLLECTION),
      where('status', '==', 'active'),
      where('dueAt', '<', now)
    );
    const snaps = await getDocs(q);
    const updates = snaps.docs.map((d) =>
      updateDoc(d.ref, { status: 'overdue' })
    );
    await Promise.all(updates);
    return snaps.docs.length;
  },
};
