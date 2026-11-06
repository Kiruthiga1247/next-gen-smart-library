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
  limit,
  startAfter,
  serverTimestamp,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Book } from '../types';
import type { BookFormData } from '../schemas';

const BOOKS_COLLECTION = 'books';

function docToBook(snap: QueryDocumentSnapshot<DocumentData>): Book {
  return { id: snap.id, ...snap.data() } as Book;
}

export const bookService = {
  async getById(id: string): Promise<Book | null> {
    const snap = await getDoc(doc(db, BOOKS_COLLECTION, id));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Book) : null;
  },

  async getAll(includeArchived = false): Promise<Book[]> {
    const q = includeArchived
      ? query(collection(db, BOOKS_COLLECTION), orderBy('title'))
      : query(
          collection(db, BOOKS_COLLECTION),
          where('isArchived', '==', false),
          orderBy('title')
        );
    const snaps = await getDocs(q);
    return snaps.docs.map(docToBook);
  },

  async getPaginated(
    pageSize: number,
    lastDoc?: QueryDocumentSnapshot<DocumentData>
  ): Promise<{ books: Book[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
    let q = query(
      collection(db, BOOKS_COLLECTION),
      where('isArchived', '==', false),
      orderBy('title'),
      limit(pageSize)
    );
    if (lastDoc) {
      q = query(
        collection(db, BOOKS_COLLECTION),
        where('isArchived', '==', false),
        orderBy('title'),
        startAfter(lastDoc),
        limit(pageSize)
      );
    }
    const snaps = await getDocs(q);
    const books = snaps.docs.map(docToBook);
    const last = snaps.docs.length > 0 ? snaps.docs[snaps.docs.length - 1] : null;
    return { books, lastDoc: last };
  },

  async create(data: BookFormData): Promise<string> {
    const authors = data.authors.split(',').map((a) => a.trim()).filter(Boolean);
    const keywords = data.keywords
      ? data.keywords.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean)
      : [];

    const ref = await addDoc(collection(db, BOOKS_COLLECTION), {
      title: data.title.trim(),
      normalizedTitle: data.title.trim().toLowerCase(),
      authors,
      isbn: data.isbn.trim(),
      category: data.category,
      edition: data.edition ?? '',
      publisher: data.publisher ?? '',
      publishYear: data.publishYear ?? null,
      description: data.description ?? '',
      keywords,
      language: data.language ?? 'English',
      pageCount: data.pageCount ?? null,
      coverColor: '#1e3a8a',
      isArchived: false,
      totalCopies: 0,
      availableCopies: 0,
      averageRating: 0,
      reviewCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  },

  async update(id: string, data: Partial<BookFormData>): Promise<void> {
    const updates: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (data.title !== undefined) {
      updates.title = data.title.trim();
      updates.normalizedTitle = data.title.trim().toLowerCase();
    }
    if (data.authors !== undefined) {
      updates.authors = data.authors.split(',').map((a) => a.trim()).filter(Boolean);
    }
    if (data.keywords !== undefined) {
      updates.keywords = data.keywords.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean);
    }
    const simpleFields = ['isbn', 'category', 'edition', 'publisher', 'publishYear', 'description', 'language', 'pageCount'] as const;
    for (const field of simpleFields) {
      if (data[field] !== undefined) updates[field] = data[field];
    }
    await updateDoc(doc(db, BOOKS_COLLECTION, id), updates);
  },

  async archive(id: string): Promise<void> {
    await updateDoc(doc(db, BOOKS_COLLECTION, id), {
      isArchived: true,
      updatedAt: serverTimestamp(),
    });
  },

  async unarchive(id: string): Promise<void> {
    await updateDoc(doc(db, BOOKS_COLLECTION, id), {
      isArchived: false,
      updatedAt: serverTimestamp(),
    });
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, BOOKS_COLLECTION, id));
  },

  // Used internally to update aggregate counts
  async updateCounts(id: string, totalCopies: number, availableCopies: number): Promise<void> {
    await updateDoc(doc(db, BOOKS_COLLECTION, id), {
      totalCopies,
      availableCopies,
      updatedAt: serverTimestamp(),
    });
  },

  async updateRating(id: string, averageRating: number, reviewCount: number): Promise<void> {
    await updateDoc(doc(db, BOOKS_COLLECTION, id), {
      averageRating,
      reviewCount,
      updatedAt: serverTimestamp(),
    });
  },

  async getByCategory(category: string): Promise<Book[]> {
    const q = query(
      collection(db, BOOKS_COLLECTION),
      where('category', '==', category),
      where('isArchived', '==', false),
      orderBy('title')
    );
    const snaps = await getDocs(q);
    return snaps.docs.map(docToBook);
  },
};
