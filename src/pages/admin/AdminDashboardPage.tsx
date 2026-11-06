import { useState, useEffect } from 'react';
import {
  BookOpen, Copy, ArrowLeftRight, Clock, AlertTriangle,
  TrendingUp, Users, Library,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AdminSidebar } from '../../components/layout/AdminSidebar';
import { StatCardSkeleton } from '../../components/ui/Skeleton';
import { statsService } from '../../services/statsService';
import { auditService } from '../../services/auditService';
import type { LibraryStats, AuditLog } from '../../types';

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: number | string; color: string;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-3">
        <p className="text-slate-400 text-sm">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={16} className="text-white" />
        </div>
      </div>
      <p className="font-display text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      statsService.getLibraryStats(),
      auditService.getRecent(10),
    ]).then(([s, logs]) => {
      setStats(s);
      setAuditLogs(logs);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-content animate-in">
        <div className="flex items-center gap-3 mb-6">
          <Library size={22} className="text-primary-400" />
          <div>
            <h1 className="font-display text-xl font-bold text-white">Admin Overview</h1>
            <p className="text-slate-500 text-sm">Library at a glance</p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {loading ? (
            Array.from({ length: 7 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : stats ? (
            <>
              <StatCard icon={BookOpen} label="Total Titles" value={stats.totalTitles} color="bg-primary-600" />
              <StatCard icon={Copy} label="Total Copies" value={stats.totalCopies} color="bg-indigo-600" />
              <StatCard icon={TrendingUp} label="Available" value={stats.availableCopies} color="bg-emerald-600" />
              <StatCard icon={ArrowLeftRight} label="Borrowed" value={stats.borrowedCopies} color="bg-amber-600" />
              <StatCard icon={Clock} label="Pending Requests" value={stats.pendingReservations} color="bg-blue-600" />
              <StatCard icon={Users} label="Active Loans" value={stats.activeLoans} color="bg-violet-600" />
              <StatCard icon={AlertTriangle} label="Overdue" value={stats.overdueLoans} color="bg-red-600" />
            </>
          ) : null}
        </div>

        {/* Quick links */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {[
            { to: '/admin/books', label: 'Manage Books', icon: BookOpen, desc: 'Add, edit, archive titles' },
            { to: '/admin/loans', label: 'Issue / Return', icon: ArrowLeftRight, desc: 'Process book transactions' },
            { to: '/admin/reservations', label: 'Reservations', icon: Clock, desc: 'Approve or cancel requests' },
          ].map(({ to, label, icon: Icon, desc }) => (
            <Link key={to} to={to} className="card-hover p-5 flex gap-4 items-start">
              <div className="w-10 h-10 bg-primary-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon size={18} className="text-primary-400" />
              </div>
              <div>
                <p className="font-semibold text-white">{label}</p>
                <p className="text-slate-500 text-xs mt-0.5">{desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Recent audit logs */}
        <div>
          <h2 className="font-semibold text-slate-300 mb-3 text-sm uppercase tracking-wide">Recent Activity</h2>
          <div className="card overflow-hidden">
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">No activity recorded yet.</div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {auditLogs.map((log) => (
                  <div key={log.id} className="px-4 py-3 flex items-center gap-3 text-sm hover:bg-slate-800/30">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-slate-300">{log.action.replace('.', ' ')}</span>
                      <span className="text-slate-500 ml-2 text-xs">by {log.actorName}</span>
                    </div>
                    <span className="text-slate-600 text-xs flex-shrink-0">
                      {log.timestamp?.toDate?.()?.toLocaleTimeString() ?? ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
