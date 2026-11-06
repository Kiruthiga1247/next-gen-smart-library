import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Copy, ArrowLeftRight,
  ClipboardList, Upload, FileText, ChevronRight, Library, Menu, X,
} from 'lucide-react';
import { clsx } from 'clsx';

const ADMIN_NAV = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/books', label: 'Books', icon: BookOpen },
  { to: '/admin/copies', label: 'Physical Copies', icon: Copy },
  { to: '/admin/loans', label: 'Issue / Return', icon: ArrowLeftRight },
  { to: '/admin/reservations', label: 'Reservations', icon: ClipboardList },
  { to: '/admin/import', label: 'CSV Import/Export', icon: Upload },
  { to: '/admin/audit', label: 'Audit Log', icon: FileText },
];

export function AdminSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const navContent = (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-6 px-2">
        <Library size={18} className="text-purple-400" />
        <span className="text-sm font-semibold text-slate-300 font-display">Admin Panel</span>
      </div>
      <nav className="space-y-0.5" aria-label="Admin navigation">
        {ADMIN_NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all group',
                isActive
                  ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} className={clsx(!isActive && 'group-hover:text-slate-300')} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight size={14} />}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );

  // Suppress unused variable warning — location used to close drawer on route change
  void location;

  return (
    <>
      {/* Mobile toggle button */}
      <button
        id="admin-sidebar-toggle"
        className="fixed bottom-4 left-4 z-50 lg:hidden btn-primary !px-3 !py-3 rounded-full shadow-lg"
        onClick={() => setMobileOpen((o) => !o)}
        aria-label={mobileOpen ? 'Close admin menu' : 'Open admin menu'}
        aria-expanded={mobileOpen}
        aria-controls="admin-sidebar-drawer"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        id="admin-sidebar-drawer"
        className={clsx(
          'fixed inset-y-0 left-0 z-40 w-64 bg-surface-900 border-r border-slate-700/50 pt-16 transition-transform duration-300 lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Admin sidebar"
        role="complementary"
      >
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className="hidden lg:block w-60 flex-shrink-0 border-r border-slate-700/50 bg-surface-850/60 min-h-[calc(100vh-4rem)]"
        aria-label="Admin sidebar"
        role="complementary"
      >
        {navContent}
      </aside>
    </>
  );
}
