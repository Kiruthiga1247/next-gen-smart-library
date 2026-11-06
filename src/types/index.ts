// ============================================================
// Core domain types for Next-Gen Smart Library System
// ============================================================

import type { Timestamp } from 'firebase/firestore';

// ─── Enums ────────────────────────────────────────────────────

export type UserRole = 'student' | 'librarian' | 'admin';

export type CopyStatus = 'available' | 'borrowed' | 'reserved' | 'maintenance';

export type ReservationStatus = 'pending' | 'approved' | 'cancelled' | 'fulfilled' | 'expired';

export type LoanStatus = 'active' | 'returned' | 'overdue';

export type AuditAction =
  | 'book.created'
  | 'book.updated'
  | 'book.archived'
  | 'copy.created'
  | 'copy.updated'
  | 'copy.deleted'
  | 'loan.issued'
  | 'loan.returned'
  | 'reservation.created'
  | 'reservation.approved'
  | 'reservation.cancelled'
  | 'reservation.fulfilled'
  | 'review.created'
  | 'review.updated'
  | 'review.deleted'
  | 'user.roleChanged';

// ─── User ──────────────────────────────────────────────────────

export interface AppUser {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  studentId?: string;
  phone?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// ─── Book ──────────────────────────────────────────────────────

export interface Book {
  id: string;
  title: string;
  normalizedTitle: string;
  authors: string[];
  isbn: string;
  category: string;
  edition?: string;
  publisher?: string;
  publishYear?: number;
  description?: string;
  keywords: string[];
  coverColor?: string; // fallback color if no image
  language?: string;
  pageCount?: number;
  isArchived: boolean;
  totalCopies: number;
  availableCopies: number;
  averageRating: number;
  reviewCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Book Copy ─────────────────────────────────────────────────

export interface BookCopy {
  id: string;
  bookId: string;
  accessionNumber: string;
  rackId: string;
  rowNumber: string;
  shelfId: string;
  status: CopyStatus;
  condition?: string;
  currentLoanId?: string;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface BookCopyWithBook extends BookCopy {
  book: Book;
}

// ─── Reservation ───────────────────────────────────────────────

export interface Reservation {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  bookId: string;
  bookTitle: string;
  status: ReservationStatus;
  notes?: string;
  processedBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt?: Timestamp;
}

// ─── Loan ──────────────────────────────────────────────────────

export interface Loan {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  copyId: string;
  bookId: string;
  bookTitle: string;
  accessionNumber: string;
  issuedBy: string;
  returnedBy?: string;
  issuedAt: Timestamp;
  dueAt: Timestamp;
  returnedAt?: Timestamp;
  status: LoanStatus;
  reservationId?: string;
}

// ─── Review ────────────────────────────────────────────────────

export interface Review {
  id: string;
  bookId: string;
  studentId: string;
  studentName: string;
  rating: number; // 1-5
  comment: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Audit Log ─────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  action: AuditAction;
  targetType: string;
  targetId: string;
  details?: Record<string, unknown>;
  timestamp: Timestamp;
}

// ─── Search & Filter ───────────────────────────────────────────

export interface SearchFilters {
  query: string;
  category?: string;
  availability?: 'all' | 'available' | 'unavailable';
  sortBy?: 'relevance' | 'title' | 'rating' | 'newest';
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

// ─── UI Helpers ────────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
}

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
}

export interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

// ─── CSV Import ────────────────────────────────────────────────

export interface CsvBookRow {
  title: string;
  authors: string;
  isbn: string;
  category: string;
  edition?: string;
  publisher?: string;
  publishYear?: string;
  description?: string;
  keywords?: string;
}

export interface CsvImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
}

// ─── Dashboard Stats ───────────────────────────────────────────

export interface LibraryStats {
  totalTitles: number;
  totalCopies: number;
  availableCopies: number;
  borrowedCopies: number;
  pendingReservations: number;
  activeLoans: number;
  overdueLoans: number;
}
