import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, MapPin, Shield, TrendingUp, Search,
  ChevronRight, Star, Users, Book,
} from 'lucide-react';
import { SearchBar } from '../components/ui/SearchBar';
import { BookCard } from '../components/ui/BookCard';
import { BookCardSkeleton } from '../components/ui/Skeleton';
import { bookService } from '../services/bookService';
import { searchService } from '../services/searchService';
import type { Book as BookType } from '../types';
import { BOOK_CATEGORIES } from '../data/sampleData';

const FEATURES = [
  {
    icon: Search,
    title: 'Smart Search',
    desc: 'Find any book by title, author, ISBN, category, or keywords — with typo tolerance.',
    color: 'text-primary-400',
    bg: 'bg-primary-500/10',
  },
  {
    icon: MapPin,
    title: 'Exact Location',
    desc: 'See every copy\'s rack, row, and shelf number. Know exactly where to go.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: Shield,
    title: 'Reserve & Track',
    desc: 'Reserve unavailable books and track your loans and reservations in real time.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
  },
  {
    icon: Star,
    title: 'Reviews & Ratings',
    desc: 'Read and write honest reviews. Discover what your peers recommend.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
];

const STATS = [
  { icon: Book, value: '10,000+', label: 'Books in catalogue' },
  { icon: Users, value: '5,000+', label: 'Student users' },
  { icon: TrendingUp, value: '99%', label: 'Location accuracy' },
];

export function HomePage() {
  const [featuredBooks, setFeaturedBooks] = useState<BookType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bookService.getAll(false).then((books) => {
      setFeaturedBooks(searchService.getPopular(books, 6));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="animate-in">
      {/* ─── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-gradient opacity-90" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, #3b82f6 0%, transparent 50%), radial-gradient(circle at 80% 20%, #6366f1 0%, transparent 40%)',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36 text-center">
          <div className="inline-flex items-center gap-2 bg-primary-500/15 border border-primary-500/30 rounded-full px-4 py-1.5 mb-8 text-primary-300 text-xs font-medium">
            <BookOpen size={14} />
            Next-Gen Smart Library System
          </div>

          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Find Any Book,{' '}
            <span className="text-gradient">Locate It Instantly</span>
          </h1>

          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Search our college library catalogue. Discover which shelf, rack, and row holds the exact copy you need — right now.
          </p>

          <div className="max-w-2xl mx-auto">
            <SearchBar
              size="lg"
              navigateOnSubmit
              placeholder="Search by title, author, ISBN, category…"
              autoFocus={false}
            />
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {BOOK_CATEGORIES.slice(0, 6).map((cat) => (
                <Link
                  key={cat}
                  to={`/search?category=${encodeURIComponent(cat)}`}
                  className="text-xs text-slate-400 hover:text-primary-400 bg-slate-800/60 hover:bg-primary-500/10 border border-slate-700/60 hover:border-primary-500/30 rounded-full px-3 py-1 transition-all"
                >
                  {cat}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats ────────────────────────────────────────── */}
      <section className="border-y border-slate-700/50 bg-surface-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-3 divide-x divide-slate-700/50">
            {STATS.map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex flex-col items-center text-center px-4 py-2 gap-1">
                <Icon size={20} className="text-primary-400 mb-1" />
                <span className="font-display text-2xl font-bold text-white">{value}</span>
                <span className="text-slate-500 text-xs">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─────────────────────────────────────── */}
      <section className="page-container">
        <div className="text-center mb-12">
          <h2 className="section-title mb-2">Everything You Need</h2>
          <p className="section-subtitle">Designed for students, managed by librarians.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map(({ icon: Icon, title, desc, color, bg }) => (
            <div key={title} className="card p-6 hover:border-slate-600/80 transition-all duration-300">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-4`}>
                <Icon size={20} className={color} />
              </div>
              <h3 className="font-semibold text-white mb-2">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Featured Books ───────────────────────────────── */}
      <section className="page-container pt-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="section-title">Popular Books</h2>
            <p className="section-subtitle">Highly rated by your peers</p>
          </div>
          <Link to="/search" className="btn-outline btn-sm">
            Browse all <ChevronRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <BookCardSkeleton key={i} />)}
          </div>
        ) : featuredBooks.length > 0 ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {featuredBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        ) : (
          <div className="card p-12 text-center">
            <BookOpen size={40} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No books in the catalogue yet.</p>
            <p className="text-slate-600 text-sm mt-1">
              Librarians can add books via the Admin Panel.
            </p>
          </div>
        )}
      </section>

      {/* ─── CTA ──────────────────────────────────────────── */}
      <section className="page-container pt-0">
        <div className="relative overflow-hidden card p-8 md:p-12 text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-600/10 via-transparent to-accent/10" />
          <div className="relative">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-3">
              Ready to find your next book?
            </h2>
            <p className="text-slate-400 mb-6 max-w-lg mx-auto">
              Sign in to reserve books, write reviews, and track your reading history.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link to="/register" className="btn-primary btn-lg">Get Started Free</Link>
              <Link to="/search" className="btn-outline btn-lg">Browse Catalogue</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
