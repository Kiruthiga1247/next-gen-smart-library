import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Reservation, ReservationStatus } from '../types';
import { auditService } from './auditService';

const COLLECTION = 'reservations';

function docToReservation(snap: QueryDocumentSnapshot<DocumentData>): Reservation {
  return { id: snap.id, ...snap.data() } as Reservation;
}

export const reservationService = {
  async getById(id: string): Promise<Reservation | null> {
    const snap = await getDoc(doc(db, COLLECTION, id));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Reservation) : null;
  },

  async getByStudent(studentId: string): Promise<Reservation[]> {
    const q = query(
      collection(db, COLLECTION),
      where('studentId', '==', studentId),
      orderBy('createdAt', 'desc')
    );
    const snaps = await getDocs(q);
    return snaps.docs.map(docToReservation);
  },

  async getActiveByStudentAndBook(studentId: string, bookId: string): Promise<Reservation | null> {
    const q = query(
      collection(db, COLLECTION),
      where('studentId', '==', studentId),
      where('bookId', '==', bookId),
      where('status', 'in', ['pending', 'approved'])
    );
    const snaps = await getDocs(q);
    if (snaps.empty) return null;
    return docToReservation(snaps.docs[0]);
  },

  async getPending(): Promise<Reservation[]> {
    const q = query(
      collection(db, COLLECTION),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'asc')
    );
    const snaps = await getDocs(q);
    return snaps.docs.map(docToReservation);
  },

  async getAll(): Promise<Reservation[]> {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
    const snaps = await getDocs(q);
    return snaps.docs.map(docToReservation);
  },

  async create(params: {
    studentId: string;
    studentName: string;
    studentEmail: string;
    bookId: string;
    bookTitle: string;
    notes?: string;
  }): Promise<string> {
    // Check for duplicate active reservation
    const existing = await this.getActiveByStudentAndBook(params.studentId, params.bookId);
    if (existing) {
      throw new Error('You already have an active reservation for this book.');
    }

    const ref = await addDoc(collection(db, COLLECTION), {
      studentId: params.studentId,
      studentName: params.studentName,
      studentEmail: params.studentEmail,
      bookId: params.bookId,
      bookTitle: params.bookTitle,
      status: 'pending' as ReservationStatus,
      notes: params.notes ?? '',
      processedBy: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await auditService.log({
      actorId: params.studentId,
      actorName: params.studentName,
      action: 'reservation.created',
      targetType: 'reservation',
      targetId: ref.id,
      details: { bookId: params.bookId, bookTitle: params.bookTitle },
    });

    return ref.id;
  },

  async updateStatus(
    id: string,
    status: ReservationStatus,
    processedBy: string
  ): Promise<void> {
    await updateDoc(doc(db, COLLECTION, id), {
      status,
      processedBy,
      updatedAt: serverTimestamp(),
    });

    const actionMap: Record<ReservationStatus, 'reservation.approved' | 'reservation.cancelled' | 'reservation.fulfilled' | 'reservation.created'> = {
      approved: 'reservation.approved',
      cancelled: 'reservation.cancelled',
      fulfilled: 'reservation.fulfilled',
      pending: 'reservation.created',
      expired: 'reservation.cancelled',
    };

    if (actionMap[status]) {
      await auditService.log({
        actorId: processedBy,
        actorName: processedBy,
        action: actionMap[status],
        targetType: 'reservation',
        targetId: id,
      });
    }
  },

  async cancel(id: string, studentId: string): Promise<void> {
    const reservation = await this.getById(id);
    if (!reservation) throw new Error('Reservation not found.');
    if (reservation.studentId !== studentId) throw new Error('Not authorized to cancel this reservation.');
    if (!['pending', 'approved'].includes(reservation.status)) {
      throw new Error('Only pending or approved reservations can be cancelled.');
    }
    await this.updateStatus(id, 'cancelled', studentId);
  },
};
