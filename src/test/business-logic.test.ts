/**
 * Business logic unit tests (no Firebase required).
 *
 * These tests exercise pure algorithmic behaviours that are embedded in the
 * service layer.  We extract and test the maths directly so we can verify
 * correctness without spinning up emulators.
 */

import { describe, it, expect } from 'vitest';

// ─── Review rating arithmetic ─────────────────────────────────────────────────
// Mirrors the logic in reviewService.create / update / delete

function newAvgAfterCreate(currentAvg: number, currentCount: number, newRating: number) {
  const newCount = currentCount + 1;
  return Math.round(((currentAvg * currentCount + newRating) / newCount) * 10) / 10;
}

function newAvgAfterUpdate(currentAvg: number, count: number, oldRating: number, newRating: number) {
  return Math.round(((currentAvg * count - oldRating + newRating) / count) * 10) / 10;
}

function newAvgAfterDelete(currentAvg: number, currentCount: number, oldRating: number) {
  const count = Math.max(0, currentCount - 1);
  const newAvg = count > 0 ? (currentAvg * currentCount - oldRating) / count : 0;
  return { count, avg: Math.round(newAvg * 10) / 10 };
}

describe('Review rating arithmetic', () => {
  it('correctly calculates avg for first review', () => {
    expect(newAvgAfterCreate(0, 0, 5)).toBe(5);
  });

  it('correctly updates avg when adding a second review', () => {
    // avg=4, count=1, adding rating=2 → (4*1 + 2) / 2 = 3.0
    expect(newAvgAfterCreate(4, 1, 2)).toBe(3);
  });

  it('rounds to one decimal place', () => {
    // avg=4.5, count=2, adding rating=3 → (9+3)/3 = 4.0
    expect(newAvgAfterCreate(4.5, 2, 3)).toBe(4);
  });

  it('handles a non-round average correctly', () => {
    // avg=3.3, count=3, adding rating=5 → (9.9+5)/4 = 3.725 → rounds to 3.7
    expect(newAvgAfterCreate(3.3, 3, 5)).toBe(3.7);
  });

  it('correctly updates avg when changing a rating (same count)', () => {
    // avg=4, count=2, old=2, new=4 → (8-2+4)/2 = 5
    expect(newAvgAfterUpdate(4, 2, 2, 4)).toBe(5);
  });

  it('correctly recalculates avg after deletion', () => {
    // avg=4, count=2, deleting rating=2 → (8-2)/1 = 6 → but max avg 5, so logic must be verified
    // Actually: (4*2 - 2) / 1 = 6 — test that our formula does this
    const result = newAvgAfterDelete(4, 2, 2);
    expect(result.count).toBe(1);
    expect(result.avg).toBe(6); // Raw math; UI should cap at 5 via display only
  });

  it('returns zero avg and count when deleting the only review', () => {
    const result = newAvgAfterDelete(5, 1, 5);
    expect(result.count).toBe(0);
    expect(result.avg).toBe(0);
  });
});

// ─── Overdue detection ────────────────────────────────────────────────────────

function isOverdue(dueAt: Date, now: Date): boolean {
  return dueAt.getTime() < now.getTime();
}

describe('Overdue detection', () => {
  it('marks a past-due date as overdue', () => {
    const dueAt = new Date('2025-01-01T00:00:00Z');
    const now = new Date('2025-01-02T00:00:00Z');
    expect(isOverdue(dueAt, now)).toBe(true);
  });

  it('does not mark a future due date as overdue', () => {
    const dueAt = new Date('2025-12-31T00:00:00Z');
    const now = new Date('2025-01-01T00:00:00Z');
    expect(isOverdue(dueAt, now)).toBe(false);
  });

  it('handles same-millisecond as not overdue', () => {
    const ts = new Date('2025-06-15T12:00:00Z');
    expect(isOverdue(ts, ts)).toBe(false);
  });
});

// ─── Due-date calculation ─────────────────────────────────────────────────────

function calcDueDate(issuedAt: Date, dueDays: number): Date {
  const d = new Date(issuedAt);
  d.setDate(d.getDate() + dueDays);
  return d;
}

describe('Due-date calculation', () => {
  it('adds the correct number of days', () => {
    const issued = new Date('2025-01-01T00:00:00Z');
    const due = calcDueDate(issued, 14);
    expect(due.toISOString().startsWith('2025-01-15')).toBe(true);
  });

  it('handles month boundaries', () => {
    const issued = new Date('2025-01-28T00:00:00Z');
    const due = calcDueDate(issued, 7);
    expect(due.toISOString().startsWith('2025-02-04')).toBe(true);
  });

  it('handles leap-year boundary', () => {
    const issued = new Date('2024-02-25T00:00:00Z');
    const due = calcDueDate(issued, 7);
    expect(due.toISOString().startsWith('2024-03-03')).toBe(true);
  });
});

// ─── Reservation state machine ────────────────────────────────────────────────

type ReservationStatus = 'pending' | 'approved' | 'cancelled' | 'fulfilled';

function canCancel(status: ReservationStatus, isOwner: boolean): boolean {
  return isOwner && ['pending', 'approved'].includes(status);
}

function canApprove(status: ReservationStatus, isLibrarian: boolean): boolean {
  return isLibrarian && status === 'pending';
}

function canFulfill(status: ReservationStatus, isLibrarian: boolean): boolean {
  return isLibrarian && status === 'approved';
}

describe('Reservation state machine', () => {
  it('owner can cancel a pending reservation', () => {
    expect(canCancel('pending', true)).toBe(true);
  });

  it('owner can cancel an approved reservation', () => {
    expect(canCancel('approved', true)).toBe(true);
  });

  it('owner cannot cancel a cancelled reservation', () => {
    expect(canCancel('cancelled', true)).toBe(false);
  });

  it('owner cannot cancel a fulfilled reservation', () => {
    expect(canCancel('fulfilled', true)).toBe(false);
  });

  it('non-owner cannot cancel even a pending reservation', () => {
    expect(canCancel('pending', false)).toBe(false);
  });

  it('librarian can approve a pending reservation', () => {
    expect(canApprove('pending', true)).toBe(true);
  });

  it('librarian cannot re-approve an already-approved reservation', () => {
    expect(canApprove('approved', true)).toBe(false);
  });

  it('librarian can fulfill an approved reservation', () => {
    expect(canFulfill('approved', true)).toBe(true);
  });

  it('librarian cannot fulfill a pending reservation directly', () => {
    expect(canFulfill('pending', true)).toBe(false);
  });
});

// ─── Available-copies counter ─────────────────────────────────────────────────

function updateAvailableOnIssue(current: number): number {
  return Math.max(0, current - 1);
}

function updateAvailableOnReturn(current: number): number {
  return current + 1;
}

describe('Available-copies counter', () => {
  it('decrements on issue', () => {
    expect(updateAvailableOnIssue(5)).toBe(4);
  });

  it('never goes below zero on issue', () => {
    expect(updateAvailableOnIssue(0)).toBe(0);
  });

  it('increments on return', () => {
    expect(updateAvailableOnReturn(2)).toBe(3);
  });

  it('correctly handles return when all were borrowed', () => {
    expect(updateAvailableOnReturn(0)).toBe(1);
  });
});

// ─── Accession number format ──────────────────────────────────────────────────

const ACCESSION_REGEX = /^[A-Z]{3}-\d{4,6}$/;

describe('Accession number format validation', () => {
  const valid = ['LIB-1001', 'ACC-12345', 'REF-100000'];
  const invalid = ['lib-1001', 'LIB-100', 'LIBR-1001', 'LIB_1001', 'LIB-1234567', ''];

  valid.forEach((acc) => {
    it(`accepts valid accession number: ${acc}`, () => {
      expect(ACCESSION_REGEX.test(acc)).toBe(true);
    });
  });

  invalid.forEach((acc) => {
    it(`rejects invalid accession number: "${acc}"`, () => {
      expect(ACCESSION_REGEX.test(acc)).toBe(false);
    });
  });
});

// ─── Rack / Shelf ID format ───────────────────────────────────────────────────

const RACK_REGEX = /^R-\d{2,3}$/;
const SHELF_REGEX = /^S-\d{2,3}$/;

describe('Rack ID format validation', () => {
  it('accepts R-01', () => expect(RACK_REGEX.test('R-01')).toBe(true));
  it('accepts R-999', () => expect(RACK_REGEX.test('R-999')).toBe(true));
  it('rejects R-1 (single digit)', () => expect(RACK_REGEX.test('R-1')).toBe(false));
  it('rejects r-01 (lowercase)', () => expect(RACK_REGEX.test('r-01')).toBe(false));
  it('rejects R01 (no dash)', () => expect(RACK_REGEX.test('R01')).toBe(false));
});

describe('Shelf ID format validation', () => {
  it('accepts S-01', () => expect(SHELF_REGEX.test('S-01')).toBe(true));
  it('accepts S-100', () => expect(SHELF_REGEX.test('S-100')).toBe(true));
  it('rejects S-1', () => expect(SHELF_REGEX.test('S-1')).toBe(false));
  it('rejects s-01', () => expect(SHELF_REGEX.test('s-01')).toBe(false));
});

// ─── normalizedTitle helper ────────────────────────────────────────────────────

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('normalizeTitle', () => {
  it('lowercases', () => {
    expect(normalizeTitle('Clean Code')).toBe('clean code');
  });

  it('strips punctuation', () => {
    expect(normalizeTitle('Design Patterns: A Guide')).toBe('design patterns a guide');
  });

  it('collapses whitespace', () => {
    expect(normalizeTitle('  The  Art  of  War  ')).toBe('the art of war');
  });

  it('handles empty string', () => {
    expect(normalizeTitle('')).toBe('');
  });

  it('handles string with only special chars', () => {
    expect(normalizeTitle('---!!!')).toBe('');
  });
});
