import { BookOpen, Star, Copy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AvailabilityBadge } from './AvailabilityBadge';
import type { Book } from '../../types';
import { clsx } from 'clsx';

interface BookCardProps {
  book: Book;
  className?: string;
}

const COVER_COLORS = [
  '#1e3a8a', '#064e3b', '#7c2d12', '#312e81', '#065f46',
  '#1c1917', '#713f12', '#831843', '#4a1d96', '#0f3460',
];

function getCoverColor(book: Book): string {
  return book.coverColor ?? COVER_COLORS[book.title.charCodeAt(0) % COVER_COLORS.length];
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1 text-xs text-slate-400">
      <Star size={12} className="fill-amber-400 text-amber-400" />
      <span className="text-amber-400 font-medium">{rating > 0 ? rating.toFixed(1) : '—'}</span>
      {count > 0 && <span>({count})</span>}
    </div>
  );
}

export function BookCard({ book, className }: BookCardProps) {
  const coverColor = getCoverColor(book);
  const availabilityStatus = book.availableCopies > 0 ? 'available' : 'unavailable';

  return (
    <Link
      to={`/books/${book.id}`}
      className={clsx('card-hover block group focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none rounded-xl', className)}
      aria-label={`${book.title} by ${book.authors.join(', ')}`}
    >
      {/* Cover */}
      <div
        className="relative h-44 rounded-t-xl flex items-center justify-center overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${coverColor}dd 0%, ${coverColor}88 100%)` }}
      >
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)', backgroundSize: '8px 8px' }}
        />
        <BookOpen size={48} className="text-white/40 group-hover:text-white/60 transition-colors" />
        <div className="absolute top-2 right-2">
          <AvailabilityBadge status={availabilityStatus} />
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-white text-sm leading-snug line-clamp-2 mb-1 group-hover:text-primary-400 transition-colors">
          {book.title}
        </h3>
        <p className="text-slate-400 text-xs mb-2 line-clamp-1">
          {book.authors.join(', ')}
        </p>

        <div className="flex items-center justify-between mb-3">
          <span className="badge bg-slate-700/80 text-slate-300 border-slate-600/50 text-xs">
            {book.category}
          </span>
          <StarRating rating={book.averageRating} count={book.reviewCount} />
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Copy size={11} />
          <span>
            {book.availableCopies}/{book.totalCopies} copies available
          </span>
        </div>

        {book.edition && (
          <p className="text-xs text-slate-600 mt-1 truncate">{book.edition}</p>
        )}
      </div>
    </Link>
  );
}
