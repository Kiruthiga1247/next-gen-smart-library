import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  BookOpen, User, LogOut, LayoutDashboard, Library,
  Menu, X, ChevronDown, Shield,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

const NAV_LINKS = [
  { to: '/search', label: 'Browse Books' },
  { to: '/about', label: 'About' },
];

export function Navbar() {
  const { firebaseUser, appUser, isLibrarian } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/');
      toast.success('Logged out successfully');
    } catch {
      toast.error('Failed to log out');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-700/50 bg-surface-900/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group flex-shrink-0"
            aria-label="Next-Gen Library home"
          >
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shadow-glow group-hover:bg-primary-500 transition-colors">
              <BookOpen size={18} className="text-white" />
            </div>
            <span className="font-display font-bold text-white hidden sm:block">
              Next<span className="text-primary-400">Gen</span> Library
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  clsx(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-600/20 text-primary-400'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  )
                }
              >
                {label}
              </NavLink>
            ))}
            {isLibrarian && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  clsx(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1',
                    isActive
                      ? 'bg-purple-600/20 text-purple-400'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  )
                }
              >
                <Shield size={14} />
                Admin
              </NavLink>
            )}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {firebaseUser ? (
              <div className="relative">
                <button
                  id="profile-menu-btn"
                  onClick={() => setProfileOpen((o) => !o)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors group"
                  aria-haspopup="true"
                  aria-expanded={profileOpen}
                >
                  <div className="w-7 h-7 rounded-full bg-primary-600/30 border border-primary-500/40 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary-400">
                      {(appUser?.displayName ?? firebaseUser.displayName ?? 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm text-slate-300 group-hover:text-white hidden sm:block max-w-[120px] truncate">
                    {appUser?.displayName ?? firebaseUser.displayName ?? 'User'}
                  </span>
                  <ChevronDown size={14} className={clsx('text-slate-500 transition-transform', profileOpen && 'rotate-180')} />
                </button>

                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-52 glass border border-slate-600/50 rounded-xl shadow-glass z-20 py-1 animate-slide-down">
                      <div className="px-3 py-2 border-b border-slate-700/50">
                        <p className="text-xs text-slate-500">Signed in as</p>
                        <p className="text-sm font-medium text-white truncate">{firebaseUser.email}</p>
                      </div>
                      <Link
                        to="/dashboard"
                        className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors"
                        onClick={() => setProfileOpen(false)}
                      >
                        <LayoutDashboard size={15} />
                        Dashboard
                      </Link>
                      {isLibrarian && (
                        <Link
                          to="/admin"
                          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors"
                          onClick={() => setProfileOpen(false)}
                        >
                          <Library size={15} />
                          Admin Panel
                        </Link>
                      )}
                      <button
                        onClick={() => { setProfileOpen(false); handleLogout(); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                      >
                        <LogOut size={15} />
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn-ghost btn-sm hidden sm:flex">
                  <User size={15} />
                  Sign In
                </Link>
                <Link to="/register" className="btn-primary btn-sm">
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              className="btn-ghost btn-sm !px-2 md:hidden"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-slate-700/50 py-3 space-y-1 animate-slide-down">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  clsx(
                    'block px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive ? 'bg-primary-600/20 text-primary-400' : 'text-slate-400 hover:text-white'
                  )
                }
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </NavLink>
            ))}
            {isLibrarian && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  clsx('block px-3 py-2 rounded-lg text-sm font-medium transition-colors', isActive ? 'text-purple-400' : 'text-slate-400 hover:text-white')}
                onClick={() => setMenuOpen(false)}
              >
                Admin Panel
              </NavLink>
            )}
            {!firebaseUser && (
              <div className="pt-2 border-t border-slate-700/50 flex gap-2">
                <Link to="/login" className="btn-secondary btn-sm flex-1 justify-center" onClick={() => setMenuOpen(false)}>Sign In</Link>
                <Link to="/register" className="btn-primary btn-sm flex-1 justify-center" onClick={() => setMenuOpen(false)}>Register</Link>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
