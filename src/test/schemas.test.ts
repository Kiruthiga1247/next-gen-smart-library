import { describe, it, expect } from 'vitest';
import { bookSchema, bookCopySchema, reviewSchema, loginSchema, registerSchema, csvBookRowSchema } from '../schemas';

// ─── Book schema ────────────────────────────────────────────────────────────

describe('bookSchema', () => {
  it('accepts valid book data', () => {
    const result = bookSchema.safeParse({
      title: 'Clean Code',
      authors: 'Robert Martin',
      isbn: '978-0-13-235088-4',
      category: 'Computer Science',
      edition: '1st',
      publisher: 'Prentice Hall',
      publishYear: 2008,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    const result = bookSchema.safeParse({ title: '', authors: 'A', isbn: '0000000000', category: 'CS' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain('title');
  });

  it('rejects ISBN shorter than 10 chars', () => {
    const result = bookSchema.safeParse({ title: 'T', authors: 'A', isbn: '123', category: 'CS' });
    expect(result.success).toBe(false);
  });

  it('rejects future publish year beyond next year', () => {
    const result = bookSchema.safeParse({
      title: 'T', authors: 'A', isbn: '0000000000', category: 'CS',
      publishYear: 2100,
    });
    expect(result.success).toBe(false);
  });
});

// ─── BookCopy schema ────────────────────────────────────────────────────────

describe('bookCopySchema', () => {
  it('accepts valid copy data', () => {
    const result = bookCopySchema.safeParse({
      bookId: 'book-123',
      accessionNumber: 'LIB-1001',
      rackId: 'R-01',
      rowNumber: '01',
      shelfId: 'S-01',
      status: 'available',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid accession number format', () => {
    const result = bookCopySchema.safeParse({
      bookId: 'book-123',
      accessionNumber: 'INVALID',
      rackId: 'R-01',
      rowNumber: '01',
      shelfId: 'S-01',
      status: 'available',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid rack ID format', () => {
    const result = bookCopySchema.safeParse({
      bookId: 'book-123',
      accessionNumber: 'LIB-1001',
      rackId: 'RACK1',
      rowNumber: '01',
      shelfId: 'S-01',
      status: 'available',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid status', () => {
    const result = bookCopySchema.safeParse({
      bookId: 'book-123',
      accessionNumber: 'LIB-1001',
      rackId: 'R-01',
      rowNumber: '01',
      shelfId: 'S-01',
      status: 'lost', // invalid
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid statuses', () => {
    const statuses = ['available', 'borrowed', 'reserved', 'maintenance'];
    for (const status of statuses) {
      const result = bookCopySchema.safeParse({
        bookId: 'book-123',
        accessionNumber: 'LIB-1001',
        rackId: 'R-01',
        rowNumber: '01',
        shelfId: 'S-01',
        status,
      });
      expect(result.success).toBe(true);
    }
  });
});

// ─── Review schema ──────────────────────────────────────────────────────────

describe('reviewSchema', () => {
  it('accepts valid review', () => {
    const result = reviewSchema.safeParse({ rating: 4, comment: 'This is a great book indeed!' });
    expect(result.success).toBe(true);
  });

  it('rejects rating below 1', () => {
    const result = reviewSchema.safeParse({ rating: 0, comment: 'Bad book indeed really.' });
    expect(result.success).toBe(false);
  });

  it('rejects rating above 5', () => {
    const result = reviewSchema.safeParse({ rating: 6, comment: 'Amazing book indeed!' });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer rating', () => {
    const result = reviewSchema.safeParse({ rating: 3.5, comment: 'Decent book actually though.' });
    expect(result.success).toBe(false);
  });

  it('rejects comment shorter than 10 characters', () => {
    const result = reviewSchema.safeParse({ rating: 5, comment: 'Good' });
    expect(result.success).toBe(false);
  });
});

// ─── Auth schemas ────────────────────────────────────────────────────────────

describe('loginSchema', () => {
  it('accepts valid login', () => {
    const result = loginSchema.safeParse({ email: 'student@college.edu', password: 'password123' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'notanemail', password: 'password123' });
    expect(result.success).toBe(false);
  });

  it('rejects password shorter than 6 chars', () => {
    const result = loginSchema.safeParse({ email: 'a@b.com', password: '12345' });
    expect(result.success).toBe(false);
  });
});

describe('registerSchema', () => {
  it('rejects mismatched passwords', () => {
    const result = registerSchema.safeParse({
      displayName: 'Test User',
      email: 'test@college.edu',
      password: 'password123',
      confirmPassword: 'different123',
    });
    expect(result.success).toBe(false);
    const issue = result.error?.issues.find((i) => i.path.includes('confirmPassword'));
    expect(issue).toBeDefined();
  });

  it('accepts matching passwords', () => {
    const result = registerSchema.safeParse({
      displayName: 'Test User',
      email: 'test@college.edu',
      password: 'password123',
      confirmPassword: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects short display name', () => {
    const result = registerSchema.safeParse({
      displayName: 'A',
      email: 'test@college.edu',
      password: 'password123',
      confirmPassword: 'password123',
    });
    expect(result.success).toBe(false);
  });
});

// ─── CSV schema ─────────────────────────────────────────────────────────────

describe('csvBookRowSchema', () => {
  it('accepts valid CSV row', () => {
    const result = csvBookRowSchema.safeParse({
      title: 'Clean Code',
      authors: 'Robert Martin',
      isbn: '978-0-13-235088-4',
      category: 'Computer Science',
    });
    expect(result.success).toBe(true);
  });

  it('rejects row with missing required fields', () => {
    const result = csvBookRowSchema.safeParse({
      title: 'Clean Code',
      // missing authors, isbn, category
    });
    expect(result.success).toBe(false);
  });

  it('accepts row with optional fields absent', () => {
    const result = csvBookRowSchema.safeParse({
      title: 'Clean Code',
      authors: 'Robert Martin',
      isbn: '978-0-13-235088-4',
      category: 'Computer Science',
    });
    expect(result.success).toBe(true);
  });
});
