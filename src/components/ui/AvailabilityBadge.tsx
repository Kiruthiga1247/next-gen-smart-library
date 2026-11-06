import { clsx } from 'clsx';
import type { CopyStatus, LoanStatus, ReservationStatus } from '../../types';

interface AvailabilityBadgeProps {
  status: CopyStatus | LoanStatus | ReservationStatus | 'available' | 'unavailable';
  count?: number;
  className?: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  available:    { label: 'Available',    className: 'badge-available' },
  borrowed:     { label: 'Borrowed',     className: 'badge-borrowed' },
  reserved:     { label: 'Reserved',     className: 'badge-reserved' },
  maintenance:  { label: 'Maintenance',  className: 'badge-maintenance' },
  pending:      { label: 'Pending',      className: 'badge-pending' },
  approved:     { label: 'Approved',     className: 'badge-approved' },
  cancelled:    { label: 'Cancelled',    className: 'badge-cancelled' },
  fulfilled:    { label: 'Fulfilled',    className: 'badge-fulfilled' },
  expired:      { label: 'Expired',      className: 'badge-cancelled' },
  active:       { label: 'Active',       className: 'badge-active' },
  returned:     { label: 'Returned',     className: 'badge-returned' },
  overdue:      { label: 'Overdue',      className: 'badge-overdue' },
  unavailable:  { label: 'Unavailable',  className: 'badge-borrowed' },
};

export function AvailabilityBadge({ status, count, className }: AvailabilityBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'badge-cancelled' };
  return (
    <span className={clsx(config.className, className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {config.label}
      {count !== undefined && ` (${count})`}
    </span>
  );
}
