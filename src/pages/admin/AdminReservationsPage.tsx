import { useState, useEffect } from 'react';
import { Check, X, Clock, Search } from 'lucide-react';
import { AdminSidebar } from '../../components/layout/AdminSidebar';
import { AvailabilityBadge } from '../../components/ui/AvailabilityBadge';
import { TableRowSkeleton } from '../../components/ui/Skeleton';
import { ConfirmModal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { reservationService } from '../../services/reservationService';
import type { Reservation } from '../../types';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

const PAGE_SIZE = 15;

export function AdminReservationsPage() {
  const { appUser } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [actionTarget, setActionTarget] = useState<{ reservation: Reservation; action: 'approved' | 'cancelled' | 'fulfilled' } | null>(null);
  const [processing, setProcessing] = useState(false);

  const fetchReservations = () => {
    setLoading(true);
    reservationService.getAll().then(setReservations).finally(() => setLoading(false));
  };

  useEffect(() => { fetchReservations(); }, []);

  const filtered = reservations.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery = !q ||
      r.bookTitle.toLowerCase().includes(q) ||
      r.studentName.toLowerCase().includes(q) ||
      r.studentEmail.toLowerCase().includes(q);
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchesQuery && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAction = async () => {
    if (!actionTarget || !appUser) return;
    setProcessing(true);
    try {
      await reservationService.updateStatus(
        actionTarget.reservation.id,
        actionTarget.action,
        appUser.uid
      );
      toast.success(`Reservation ${actionTarget.action}`);
      fetchReservations();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setProcessing(false);
      setActionTarget(null);
    }
  };

  const getActionLabel = () => {
    if (!actionTarget) return '';
    const labels = { approved: 'Approve', cancelled: 'Cancel', fulfilled: 'Mark as Fulfilled' };
    return labels[actionTarget.action] ?? '';
  };

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-content animate-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-xl font-bold text-white">Reservations</h1>
            <p className="text-slate-500 text-sm">{filtered.length} records</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              placeholder="Search student, book…"
              className="input pl-8 h-9 text-sm"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="input h-9 text-sm !w-auto"
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          >
            {['all', 'pending', 'approved', 'cancelled', 'fulfilled', 'expired'].map((s) => (
              <option key={s} value={s} className="bg-slate-800 capitalize">{s === 'all' ? 'All statuses' : s}</option>
            ))}
          </select>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/50 border-b border-slate-700/50">
                <tr>
                  {['Book', 'Student', 'Requested', 'Status', 'Notes', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                      <Clock size={28} className="mx-auto mb-2 text-slate-700" />
                      No reservations found
                    </td>
                  </tr>
                ) : (
                  paged.map((res) => (
                    <tr key={res.id} className="border-b border-slate-700/30 hover:bg-slate-800/30">
                      <td className="px-4 py-3 text-white max-w-[160px] truncate">{res.bookTitle}</td>
                      <td className="px-4 py-3">
                        <p className="text-slate-300">{res.studentName}</p>
                        <p className="text-xs text-slate-500">{res.studentEmail}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {res.createdAt?.toDate?.()?.toLocaleDateString() ?? '—'}
                      </td>
                      <td className="px-4 py-3"><AvailabilityBadge status={res.status} /></td>
                      <td className="px-4 py-3 text-slate-500 text-xs max-w-[120px] truncate">
                        {res.notes || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {res.status === 'pending' && (
                          <div className="flex gap-1">
                            <button
                              id={`approve-res-${res.id}`}
                              className="btn-success btn-sm !py-1 !px-2"
                              title="Approve"
                              onClick={() => setActionTarget({ reservation: res, action: 'approved' })}
                            >
                              <Check size={13} />
                            </button>
                            <button
                              id={`cancel-res-${res.id}`}
                              className="btn-danger btn-sm !py-1 !px-2"
                              title="Cancel"
                              onClick={() => setActionTarget({ reservation: res, action: 'cancelled' })}
                            >
                              <X size={13} />
                            </button>
                          </div>
                        )}
                        {res.status === 'approved' && (
                          <button
                            className="btn-primary btn-sm !py-1 text-xs"
                            onClick={() => setActionTarget({ reservation: res, action: 'fulfilled' })}
                          >
                            Mark Fulfilled
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-700/50 flex justify-end">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>

        <ConfirmModal
          isOpen={!!actionTarget}
          onClose={() => setActionTarget(null)}
          onConfirm={handleAction}
          title={getActionLabel()}
          message={`${getActionLabel()} reservation for "${actionTarget?.reservation.bookTitle}" by ${actionTarget?.reservation.studentName}?`}
          confirmLabel={getActionLabel()}
          variant={actionTarget?.action === 'cancelled' ? 'danger' : 'info'}
          loading={processing}
        />
      </div>
    </div>
  );
}
