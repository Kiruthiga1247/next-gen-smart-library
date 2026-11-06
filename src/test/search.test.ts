import { describe, it, expect } from 'vitest';
import { searchService } from '../services/searchService';
import type { Book } from '../types';
import { Timestamp } from 'firebase/firestore';

// ─── Mock book factory ──────────────────────────────────────────────────────

function makeBook(overrides: Partial<Book> = {}): Book {
  const now = Timestamp.now();
  return {
    id: 'book-1',
    title: 'Introduction to Algorithms',
    normalizedTitle: 'introduction to algorithms',
    authors: ['Thomas H. Cormen', 'Charles E. Leiserson'],
    isbn: '978-0-262-04630-5',
    category: 'Computer Science',
    edition: '4th Edition',
    publisher: 'MIT Press',
    publishYear: 2022,
    description: 'A comprehensive algorithms textbook',
    keywords: ['algorithms', 'data structures', 'complexity'],
    isArchived: false,
    totalCopies: 3,
    availableCopies: 2,
    averageRating: 4.7,
    reviewCount: 10,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const SAMPLE_BOOKS: Book[] = [
  makeBook({ id: 'b1', title: 'Introduction to Algorithms', authors: ['Cormen'] }),
  makeBook({ id: 'b2', title: 'Clean Code', authors: ['Robert Martin'], category: 'Computer Science', keywords: ['clean code', 'refactoring'], availableCopies: 0 }),
  makeBook({ id: 'b3', title: 'Calculus: Early Transcendentals', authors: ['James Stewart'], category: 'Mathematics', keywords: ['calculus', 'integrals'] }),
  makeBook({ id: 'b4', title: 'University Physics', authors: ['Young', 'Freedman'], category: 'Physics', availableCopies: 1 }),
  makeBook({ id: 'b5', title: 'Organic Chemistry', authors: ['Bruice'], category: 'Chemistry', availableCopies: 0 }),
];

// ─── Search tests ────────────────────────────────────────────────────────────

describe('searchService.search', () => {
  it('returns all non-archived books when query is empty', () => {
    const results = searchService.search(SAMPLE_BOOKS, { query: '' });
    expect(results).toHaveLength(5);
  });

  it('finds book by exact title', () => {
    const results = searchService.search(SAMPLE_BOOKS, { query: 'Clean Code' });
    expect(results[0].id).toBe('b2');
  });

  it('is case-insensitive', () => {
    const results = searchService.search(SAMPLE_BOOKS, { query: 'clean code' });
    expect(results[0].id).toBe('b2');
    const results2 = searchService.search(SAMPLE_BOOKS, { query: 'CALCULUS' });
    expect(results2[0].id).toBe('b3');
  });

  it('finds book by author name', () => {
    const results = searchService.search(SAMPLE_BOOKS, { query: 'Cormen' });
    expect(results.some((b) => b.id === 'b1')).toBe(true);
  });

  it('finds book by author last name partial', () => {
    const results = searchService.search(SAMPLE_BOOKS, { query: 'Stewart' });
    expect(results.some((b) => b.id === 'b3')).toBe(true);
  });

  it('finds book by ISBN', () => {
    const results = searchService.search(SAMPLE_BOOKS, { query: '978-0-262-04630-5' });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('b1');
  });

  it('finds book by keyword', () => {
    const results = searchService.search(SAMPLE_BOOKS, { query: 'refactoring' });
    expect(results.some((b) => b.id === 'b2')).toBe(true);
  });

  it('returns empty array for completely unrelated query', () => {
    const results = searchService.search(SAMPLE_BOOKS, { query: 'zzzznotarealbook' });
    expect(results).toHaveLength(0);
  });

  it('handles whitespace-only input gracefully', () => {
    const results = searchService.search(SAMPLE_BOOKS, { query: '   ' });
    expect(results).toHaveLength(5);
  });

  it('filters by category', () => {
    const results = searchService.search(SAMPLE_BOOKS, {
      query: '',
      category: 'Mathematics',
    });
    expect(results.every((b) => b.category === 'Mathematics')).toBe(true);
    expect(results.some((b) => b.id === 'b3')).toBe(true);
  });

  it('filters by availability: available', () => {
    const results = searchService.search(SAMPLE_BOOKS, {
      query: '',
      availability: 'available',
    });
    expect(results.every((b) => b.availableCopies > 0)).toBe(true);
  });

  it('filters by availability: unavailable', () => {
    const results = searchService.search(SAMPLE_BOOKS, {
      query: '',
      availability: 'unavailable',
    });
    expect(results.every((b) => b.availableCopies === 0)).toBe(true);
  });

  it('sorts by title A-Z', () => {
    const results = searchService.search(SAMPLE_BOOKS, {
      query: '',
      sortBy: 'title',
    });
    const titles = results.map((b) => b.title);
    const sorted = [...titles].sort((a, b) => a.localeCompare(b));
    expect(titles).toEqual(sorted);
  });

  it('sorts by rating descending', () => {
    const results = searchService.search(SAMPLE_BOOKS, {
      query: '',
      sortBy: 'rating',
    });
    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].averageRating).toBeGreaterThanOrEqual(results[i + 1].averageRating);
    }
  });

  it('excludes archived books', () => {
    const withArchived = [
      ...SAMPLE_BOOKS,
      makeBook({ id: 'archived', isArchived: true, title: 'Old Book' }),
    ];
    const results = searchService.search(withArchived, { query: 'Old Book' });
    expect(results.every((b) => !b.isArchived)).toBe(true);
    expect(results.find((b) => b.id === 'archived')).toBeUndefined();
  });

  // Typo tolerance
  it('handles minor typos in title (1 char off)', () => {
    // "Algoritms" instead of "Algorithms"
    const results = searchService.search(SAMPLE_BOOKS, { query: 'Algoritms' });
    expect(results.some((b) => b.id === 'b1')).toBe(true);
  });

  it('handles typo in author name', () => {
    // "Stward" instead of "Stewart"
    const results = searchService.search(SAMPLE_BOOKS, { query: 'Stewrt' });
    expect(results.some((b) => b.id === 'b3')).toBe(true);
  });
});

// ─── Multiple copies tests ──────────────────────────────────────────────────

describe('Book copy availability', () => {
  it('correctly reports available count', () => {
    const book = makeBook({ totalCopies: 5, availableCopies: 3 });
    expect(book.availableCopies).toBe(3);
    expect(book.totalCopies).toBe(5);
  });

  it('a book with 0 available copies is unavailable', () => {
    const book = makeBook({ availableCopies: 0 });
    expect(book.availableCopies).toBe(0);
  });
});

// ─── Related books ──────────────────────────────────────────────────────────

describe('searchService.getRelated', () => {
  it('returns books in same category first', () => {
    const base = SAMPLE_BOOKS[0]; // Computer Science
    const related = searchService.getRelated(base, SAMPLE_BOOKS, 5);
    // Should include Clean Code (also CS)
    expect(related.some((b) => b.id === 'b2')).toBe(true);
    // Should not include the book itself
    expect(related.every((b) => b.id !== base.id)).toBe(true);
  });

  it('never includes the source book in results', () => {
    for (const book of SAMPLE_BOOKS) {
      const related = searchService.getRelated(book, SAMPLE_BOOKS, 10);
      expect(related.every((b) => b.id !== book.id)).toBe(true);
    }
  });

  it('respects maxResults', () => {
    const related = searchService.getRelated(SAMPLE_BOOKS[0], SAMPLE_BOOKS, 2);
    expect(related.length).toBeLessThanOrEqual(2);
  });
});

// ─── Popular books ──────────────────────────────────────────────────────────

describe('searchService.getPopular', () => {
  it('excludes archived books', () => {
    const booksWithArchived = [
      ...SAMPLE_BOOKS,
      makeBook({ id: 'arc', isArchived: true, averageRating: 5, reviewCount: 100 }),
    ];
    const popular = searchService.getPopular(booksWithArchived, 10);
    expect(popular.every((b) => !b.isArchived)).toBe(true);
  });

  it('respects maxResults', () => {
    const popular = searchService.getPopular(SAMPLE_BOOKS, 3);
    expect(popular.length).toBeLessThanOrEqual(3);
  });
});
