import { z } from 'zod';

// ─── Book Schemas ──────────────────────────────────────────────

export const bookSchema = z.object({
  title: z.string().min(1, 'Title is required').max(300),
  authors: z.string().min(1, 'At least one author is required'),
  isbn: z.string().min(10, 'ISBN must be at least 10 characters').max(20),
  category: z.string().min(1, 'Category is required'),
  edition: z.string().optional(),
  publisher: z.string().optional(),
  publishYear: z.coerce.number().min(1000).max(new Date().getFullYear() + 1).optional(),
  description: z.string().max(2000).optional(),
  keywords: z.string().optional(),
  language: z.string().optional(),
  pageCount: z.coerce.number().min(1).optional(),
});

export type BookFormData = z.infer<typeof bookSchema>;

// ─── Book Copy Schemas ─────────────────────────────────────────

export const bookCopySchema = z.object({
  bookId: z.string().min(1, 'Book ID is required'),
  accessionNumber: z
    .string()
    .min(1, 'Accession number is required')
    .regex(/^[A-Z]{3}-\d{4,6}$/, 'Format: LIB-1001 (3 letters, dash, 4-6 digits)'),
  rackId: z
    .string()
    .min(1, 'Rack ID is required')
    .regex(/^R-\d{2,3}$/, 'Format: R-01'),
  rowNumber: z
    .string()
    .min(1, 'Row number is required')
    .regex(/^\d{2}$/, 'Format: 01'),
  shelfId: z
    .string()
    .min(1, 'Shelf ID is required')
    .regex(/^S-\d{2,3}$/, 'Format: S-01'),
  status: z.enum(['available', 'borrowed', 'reserved', 'maintenance']),
  condition: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export type BookCopyFormData = z.infer<typeof bookCopySchema>;

// ─── Reservation Schema ────────────────────────────────────────

export const reservationSchema = z.object({
  bookId: z.string().min(1, 'Book ID is required'),
  notes: z.string().max(500).optional(),
});

export type ReservationFormData = z.infer<typeof reservationSchema>;

// ─── Review Schema ─────────────────────────────────────────────

export const reviewSchema = z.object({
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  comment: z.string().min(10, 'Comment must be at least 10 characters').max(1000),
});

export type ReviewFormData = z.infer<typeof reviewSchema>;

// ─── Auth Schemas ──────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  studentId: z.string().min(3, 'Student ID must be at least 3 characters').max(20).optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export type RegisterFormData = z.infer<typeof registerSchema>;

// ─── Issue Schema ──────────────────────────────────────────────

export const issueBookSchema = z.object({
  copyId: z.string().min(1, 'Copy ID is required'),
  studentId: z.string().min(1, 'Student ID is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  reservationId: z.string().optional(),
});

export type IssueBookFormData = z.infer<typeof issueBookSchema>;

// ─── Search Schema ─────────────────────────────────────────────

export const searchSchema = z.object({
  query: z.string().max(200),
  category: z.string().optional(),
  availability: z.enum(['all', 'available', 'unavailable']).optional(),
  sortBy: z.enum(['relevance', 'title', 'rating', 'newest']).optional(),
});

export type SearchFormData = z.infer<typeof searchSchema>;

// ─── CSV Import Schema ─────────────────────────────────────────

export const csvBookRowSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  authors: z.string().min(1, 'Authors are required'),
  isbn: z.string().min(10, 'ISBN must be at least 10 chars'),
  category: z.string().min(1, 'Category is required'),
  edition: z.string().optional(),
  publisher: z.string().optional(),
  publishYear: z.string().optional(),
  description: z.string().optional(),
  keywords: z.string().optional(),
});

export type CsvBookRowData = z.infer<typeof csvBookRowSchema>;
