import { useState, useEffect } from 'react';
import {
  BookOpen, Clock, CheckCircle, XCircle, LayoutDashboard,
  Mail, BadgeCheck, BookMarked,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AvailabilityBadge } from '../components/ui/AvailabilityBadge';
import { Skeleton } from '../components/ui/Skeleton';
import { ConfirmModal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { reservationService } from '../services/reservationService';
import { loanService } from '../services/loanService';
import type { Reservation, Loan } from '../types';
import toast from 'react-hot-toast';

function formatDate(ts: Reservation['createdAt'] | Loan['issuedAt'] | undefined | null) {
  if (!ts) return '—';
  try {
    return ts.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
}

export function DashboardPage() {
  const { appUser, firebaseUser } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!firebaseUser) return;
    Promise.all([
      reservationService.getByStudent(firebaseUser.uid),
      loanService.getByStudent(firebaseUser.uid),
    ]).then(([res, lo]) => {
      setReservations(res);
      setLoans(lo);
    }).finally(() => setLoading(false));
  }, [firebaseUser]);

  const handleCancel = async () => {
    if (!cancelTarget || !firebaseUser) return;
    setCancelling(true);
    try {
      await reservationService.cancel(cancelTarget.id, firebaseUser.uid);
      setReservations((prev) =>
        prev.map((r) => r.id === cancelTarget.id ? { ...r, status: 'cancelled' as const } : r)
      );
      toast.success('Reservation cancelled');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel');
    } finally {
      setCancelling(false);
      setCancelTarget(null);
    }
  };

  const activeReservations = reservations.filter((r) => ['pending', 'approved'].includes(r.status));
  const activeLoans = loans.filter((l) => l.status === 'active' || l.status === 'overdue');

  return (
    <div className="page-container animate-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <LayoutDashboard size={24} className="text-primary-400" />
        <div>
          <h1 className="font-display text-2xl font-bold text-white">My Dashboard</h1>
          <p className="text-slate-500 text-sm">Track your reservations and borrowing history</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ─── Profile card ──────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary-600/30 border border-primary-500/40 flex items-center justify-center">
              <span className="text-lg font-bold text-primary-400">
                {appUser?.displayName?.charAt(0).toUpperCase() ?? 'U'}
              </span>
            </div>
            <div>
              <p className="font-semibold text-white">{appUser?.displayName ?? 'Student'}</p>
              <span className={`badge ${appUser?.role === 'librarian' || appUser?.role === 'admin' ? 'badge-librarian' : 'badge-student'}`}>
                {appUser?.role ?? 'student'}
              </span>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-slate-400">
              <Mail size={13} />
              <span className="truncate">{appUser?.email}</span>
            </div>
            {appUser?.studentId && (
              <div className="flex items-center gap-2 text-slate-400">
                <BadgeCheck size={13} />
                <span>{appUser.studentId}</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-700/50">
            <div className="text-center">
              <p className="text-xl font-bold text-white">{activeReservations.length}</p>
              <p className="text-xs text-slate-500">Active Reservations</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-white">{activeLoans.length}</p>
              <p className="text-xs text-slate-500">Active Loans</p>
            </div>
          </div>
        </div>

        {/* ─── Active loans ───────────────────────────── */}
        <div className="lg:col-span-2">
          <h2 className="font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <BookOpen size={16} className="text-primary-400" />
            Active Loans
          </h2>

          {loading ? (
            <div className="space-y-3">{[0,1].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          ) : activeLoans.length === 0 ? (
            <div className="card p-6 text-center">
              <BookOpen size={28} className="text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No active loans</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeLoans.map((loan) => (
                <div key={loan.id} className="card p-4 flex items-center gap-4">
                  <BookMarked size={18} className="text-primary-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-sm truncate">{loan.bookTitle}</p>
                    <p className="text-xs text-slate-500 font-mono">{loan.accessionNumber}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Due: <span className={loan.status === 'overdue' ? 'text-red-400' : 'text-slate-300'}>
                        {formatDate(loan.dueAt)}
                      </span>
                    </p>
                  </div>
                  <AvailabilityBadge status={loan.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Reservations section ──────────────────────── */}
      <div className="mt-8">
        <h2 className="font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <Clock size={16} className="text-amber-400" />
          My Reservations
        </h2>

        {loading ? (
          <div className="space-y-3">{[0,1,2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : reservations.length === 0 ? (
          <div className="card p-8 text-center">
            <Clock size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No reservations yet</p>
            <Link to="/search" className="btn-outline btn-sm mt-4">Browse Books</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {reservations.map((r) => (
              <div key={r.id} className="card p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-white text-sm truncate">{r.bookTitle}</p>
                  </div>
                  <p className="text-xs text-slate-500">Requested: {formatDate(r.createdAt)}</p>
                  {r.updatedAt && r.status !== 'pending' && (
                    <p className="text-xs text-slate-600">Updated: {formatDate(r.updatedAt)}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <AvailabilityBadge status={r.status} />
                  {['pending', 'approved'].includes(r.status) && (
                    <button
                      className="btn-ghost btn-sm text-red-400 hover:text-red-300 !px-2"
                      onClick={() => setCancelTarget(r)}
                      title="Cancel reservation"
                    >
                      <XCircle size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Loan history ──────────────────────────────── */}
      {loans.filter((l) => l.status === 'returned').length > 0 && (
        <div className="mt-8">
          <h2 className="font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <CheckCircle size={16} className="text-emerald-400" />
            Borrowing History
          </h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/50 border-b border-slate-700/50">
                <tr>
                  {['Book', 'Accession #', 'Issued', 'Returned'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loans.filter((l) => l.status === 'returned').map((loan) => (
                  <tr key={loan.id} className="border-b border-slate-700/30 hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-slate-300">{loan.bookTitle}</td>
                    <td className="px-4 py-3 font-mono text-slate-400 text-xs">{loan.accessionNumber}</td>
                    <td className="px-4 py-3 text-slate-400">{formatDate(loan.issuedAt)}</td>
                    <td className="px-4 py-3 text-emerald-400">{formatDate(loan.returnedAt ?? undefined)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        title="Cancel Reservation"
        message={`Cancel your reservation for "${cancelTarget?.bookTitle}"?`}
        confirmLabel="Yes, Cancel"
        variant="warning"
        loading={cancelling}
      />
    </div>
  );
}
