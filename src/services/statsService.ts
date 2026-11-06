import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { LibraryStats } from '../types';

export const statsService = {
  async getLibraryStats(): Promise<LibraryStats> {
    const [booksSnap, copiesSnap, reservationsSnap, loansSnap] = await Promise.all([
      getDocs(query(collection(db, 'books'), where('isArchived', '==', false))),
      getDocs(collection(db, 'bookCopies')),
      getDocs(query(collection(db, 'reservations'), where('status', '==', 'pending'))),
      getDocs(query(collection(db, 'loans'), where('status', 'in', ['active', 'overdue']))),
    ]);

    const copies = copiesSnap.docs.map((d) => d.data());
    const availableCopies = copies.filter((c) => c.status === 'available').length;
    const borrowedCopies = copies.filter((c) => c.status === 'borrowed').length;

    const now = Date.now();
    const overdueLoans = loansSnap.docs.filter((d) => {
      const data = d.data();
      const dueAt = data.dueAt?.toDate?.() as Date | undefined;
      return dueAt && dueAt.getTime() < now;
    }).length;

    return {
      totalTitles: booksSnap.size,
      totalCopies: copies.length,
      availableCopies,
      borrowedCopies,
      pendingReservations: reservationsSnap.size,
      activeLoans: loansSnap.size,
      overdueLoans,
    };
  },
};
