import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  runTransaction,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Review } from '../types';
import type { ReviewFormData } from '../schemas';

const COLLECTION = 'reviews';

function docToReview(snap: QueryDocumentSnapshot<DocumentData>): Review {
  return { id: snap.id, ...snap.data() } as Review;
}

export const reviewService = {
  async getByBook(bookId: string): Promise<Review[]> {
    const q = query(
      collection(db, COLLECTION),
      where('bookId', '==', bookId),
      orderBy('createdAt', 'desc')
    );
    const snaps = await getDocs(q);
    return snaps.docs.map(docToReview);
  },

  async getByStudent(studentId: string): Promise<Review[]> {
    const q = query(
      collection(db, COLLECTION),
      where('studentId', '==', studentId),
      orderBy('createdAt', 'desc')
    );
    const snaps = await getDocs(q);
    return snaps.docs.map(docToReview);
  },

  async getStudentReviewForBook(studentId: string, bookId: string): Promise<Review | null> {
    const q = query(
      collection(db, COLLECTION),
      where('studentId', '==', studentId),
      where('bookId', '==', bookId)
    );
    const snaps = await getDocs(q);
    if (snaps.empty) return null;
    return docToReview(snaps.docs[0]);
  },

  async create(params: {
    bookId: string;
    studentId: string;
    studentName: string;
    data: ReviewFormData;
  }): Promise<string> {
    const existing = await this.getStudentReviewForBook(params.studentId, params.bookId);
    if (existing) throw new Error('You have already reviewed this book.');

    return runTransaction(db, async (tx) => {
      const bookRef = doc(db, 'books', params.bookId);
      const bookSnap = await tx.get(bookRef);
      if (!bookSnap.exists()) throw new Error('Book not found.');

      const reviewRef = doc(collection(db, COLLECTION));
      tx.set(reviewRef, {
        bookId: params.bookId,
        studentId: params.studentId,
        studentName: params.studentName,
        rating: params.data.rating,
        comment: params.data.comment,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const currentCount = (bookSnap.data().reviewCount as number) ?? 0;
      const currentAvg = (bookSnap.data().averageRating as number) ?? 0;
      const newCount = currentCount + 1;
      const newAvg = (currentAvg * currentCount + params.data.rating) / newCount;

      tx.update(bookRef, {
        reviewCount: newCount,
        averageRating: Math.round(newAvg * 10) / 10,
        updatedAt: serverTimestamp(),
      });

      return reviewRef.id;
    });
  },

  async update(params: {
    reviewId: string;
    bookId: string;
    studentId: string;
    data: ReviewFormData;
  }): Promise<void> {
    return runTransaction(db, async (tx) => {
      const reviewRef = doc(db, COLLECTION, params.reviewId);
      const reviewSnap = await tx.get(reviewRef);
      if (!reviewSnap.exists()) throw new Error('Review not found.');
      if (reviewSnap.data().studentId !== params.studentId) throw new Error('Not authorized to edit this review.');

      const oldRating = reviewSnap.data().rating as number;
      const bookRef = doc(db, 'books', params.bookId);
      const bookSnap = await tx.get(bookRef);

      tx.update(reviewRef, {
        rating: params.data.rating,
        comment: params.data.comment,
        updatedAt: serverTimestamp(),
      });

      if (bookSnap.exists()) {
        const count = (bookSnap.data().reviewCount as number) ?? 1;
        const currentAvg = (bookSnap.data().averageRating as number) ?? 0;
        const newAvg = (currentAvg * count - oldRating + params.data.rating) / count;
        tx.update(bookRef, {
          averageRating: Math.round(newAvg * 10) / 10,
          updatedAt: serverTimestamp(),
        });
      }
    });
  },

  async delete(params: { reviewId: string; bookId: string; studentId: string; isAdmin?: boolean }): Promise<void> {
    return runTransaction(db, async (tx) => {
      const reviewRef = doc(db, COLLECTION, params.reviewId);
      const reviewSnap = await tx.get(reviewRef);
      if (!reviewSnap.exists()) throw new Error('Review not found.');
      if (!params.isAdmin && reviewSnap.data().studentId !== params.studentId) {
        throw new Error('Not authorized to delete this review.');
      }

      const oldRating = reviewSnap.data().rating as number;
      const bookRef = doc(db, 'books', params.bookId);
      const bookSnap = await tx.get(bookRef);

      tx.delete(reviewRef);

      if (bookSnap.exists()) {
        const count = Math.max(0, (bookSnap.data().reviewCount as number) - 1);
        const currentAvg = bookSnap.data().averageRating as number;
        const currentCount = bookSnap.data().reviewCount as number;
        const newAvg = count > 0
          ? (currentAvg * currentCount - oldRating) / count
          : 0;
        tx.update(bookRef, {
          reviewCount: count,
          averageRating: Math.round(newAvg * 10) / 10,
          updatedAt: serverTimestamp(),
        });
      }
    });
  },
};
