import { Link } from 'react-router-dom';
import { BookOpen, Home, Search } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="text-center animate-in">
        <div className="relative inline-block mb-8">
          <div className="w-24 h-24 rounded-full bg-primary-600/10 border border-primary-500/20 flex items-center justify-center mx-auto">
            <BookOpen size={40} className="text-primary-400" />
          </div>
          <div className="absolute -top-1 -right-1 w-8 h-8 bg-surface-900 rounded-full border border-slate-700 flex items-center justify-center">
            <span className="text-slate-400 text-lg font-bold">?</span>
          </div>
        </div>

        <h1 className="font-display text-6xl font-bold text-white mb-2">404</h1>
        <h2 className="font-display text-xl font-semibold text-slate-400 mb-4">Page Not Found</h2>
        <p className="text-slate-500 max-w-sm mx-auto mb-8">
          The page you're looking for doesn't exist or may have been moved.
          Perhaps you were looking for a book?
        </p>

        <div className="flex flex-wrap gap-3 justify-center">
          <Link to="/" className="btn-primary">
            <Home size={16} />
            Go Home
          </Link>
          <Link to="/search" className="btn-outline">
            <Search size={16} />
            Search Books
          </Link>
        </div>
      </div>
    </div>
  );
}
