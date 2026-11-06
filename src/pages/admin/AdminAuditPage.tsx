import { useState, useEffect } from 'react';
import { FileText, User, Clock } from 'lucide-react';
import { AdminSidebar } from '../../components/layout/AdminSidebar';
import { TableRowSkeleton } from '../../components/ui/Skeleton';
import { Pagination } from '../../components/ui/Pagination';
import { auditService } from '../../services/auditService';
import type { AuditLog } from '../../types';

const PAGE_SIZE = 20;

const ACTION_COLORS: Record<string, string> = {
  'book.created': 'text-emerald-400',
  'book.updated': 'text-blue-400',
  'book.archived': 'text-amber-400',
  'copy.created': 'text-emerald-400',
  'copy.updated': 'text-blue-400',
  'copy.deleted': 'text-red-400',
  'loan.issued': 'text-primary-400',
  'loan.returned': 'text-emerald-400',
  'reservation.created': 'text-blue-400',
  'reservation.approved': 'text-emerald-400',
  'reservation.cancelled': 'text-red-400',
  'reservation.fulfilled': 'text-purple-400',
  'review.created': 'text-amber-400',
  'review.deleted': 'text-red-400',
};

export function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    auditService.getRecent(200).then(setLogs).finally(() => setLoading(false));
  }, []);

  const totalPages = Math.ceil(logs.length / PAGE_SIZE);
  const paged = logs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-content animate-in">
        <div className="flex items-center gap-3 mb-6">
          <FileText size={22} className="text-primary-400" />
          <div>
            <h1 className="font-display text-xl font-bold text-white">Audit Log</h1>
            <p className="text-slate-500 text-sm">Recent system activity — {logs.length} records</p>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/50 border-b border-slate-700/50">
                <tr>
                  {['Timestamp', 'Action', 'Actor', 'Target', 'Details'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} cols={5} />)
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                      <Clock size={28} className="mx-auto mb-2 text-slate-700" />
                      No audit logs yet
                    </td>
                  </tr>
                ) : (
                  paged.map((log) => (
                    <tr key={log.id} className="border-b border-slate-700/30 hover:bg-slate-800/30">
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                        {log.timestamp?.toDate?.()?.toLocaleString() ?? '—'}
                      </td>
                      <td className={`px-4 py-3 font-mono text-xs font-medium ${ACTION_COLORS[log.action] ?? 'text-slate-300'}`}>
                        {log.action}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <User size={12} />
                          <span className="text-xs">{log.actorName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="badge bg-slate-700/60 text-slate-400 border-slate-600/50 text-xs">
                          {log.targetType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs max-w-[200px] truncate">
                        {log.details && Object.keys(log.details).length > 0
                          ? JSON.stringify(log.details).slice(0, 80)
                          : '—'}
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
      </div>
    </div>
  );
}
