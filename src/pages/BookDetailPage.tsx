import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BookOpen, Star, Copy, ArrowLeft, User, Calendar,
  Building, Hash, Tag, Bookmark, ChevronRight, AlertCircle,
} from 'lucide-react';
import { AvailabilityBadge } from '../components/ui/AvailabilityBadge';
import { LocationCard } from '../components/ui/LocationCard';
import { BookCard } from '../components/ui/BookCard';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { bookService } from '../services/bookService';
import { copyService } from '../services/copyService';
import { reviewService } from '../services/reviewService';
import { reservationService } from '../services/reservationService';
import { searchService } from '../services/searchService';
import { useAuth } from '../contexts/AuthContext';
import type { Book, BookCopy, Review } from '../types';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

function StarDisplay({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={star <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}
        />
      ))}
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="focus-visible:outline-none"
          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
        >
          <Star
            size={24}
            className={clsx(
              'transition-colors',
              star <= (hover || value) ? 'fill-amber-400 text-amber-400' : 'text-slate-600 hover:text-amber-400'
            )}
          />
        </button>
      ))}
    </div>
  );
}

export function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { firebaseUser, appUser } = useAuth();

  const [book, setBook] = useState<Book | null>(null);
  const [copies, setCopies] = useState<BookCopy[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [related, setRelated] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [hasActiveReservation, setHasActiveReservation] = useState(false);
  const [activeTab, setActiveTab] = useState<'copies' | 'reviews'>('copies');

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    Promise.all([
      bookService.getById(id),
      copyService.getByBook(id),
      reviewService.getByBook(id),
    ]).then(([b, c, r]) => {
      setBook(b);
      setCopies(c);
      setReviews(r);

      if (b) {
        bookService.getAll(false).then((all) => {
          setRelated(searchService.getRelated(b, all, 4));
        });
      }
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!firebaseUser || !id) return;
    reviewService.getStudentReviewForBook(firebaseUser.uid, id)
      .then(setMyReview);
    reservationService.getActiveByStudentAndBook(firebaseUser.uid, id)
      .then((r) => setHasActiveReservation(!!r));
  }, [firebaseUser, id]);

  const handleReserve = async () => {
    if (!firebaseUser || !appUser || !book) return;
    setReserving(true);
    try {
      await reservationService.create({
        studentId: firebaseUser.uid,
        studentName: appUser.displayName,
        studentEmail: appUser.email,
        bookId: book.id,
        bookTitle: book.title,
      });
      setHasActiveReservation(true);
      toast.success('Reservation requested! The librarian will process it shortly.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to reserve');
    } finally {
      setReserving(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!firebaseUser || !appUser || !book) return;
    if (reviewComment.trim().length < 10) {
      toast.error('Comment must be at least 10 characters');
      return;
    }
    setSubmittingReview(true);
    try {
      const id = await reviewService.create({
        bookId: book.id,
        studentId: firebaseUser.uid,
        studentName: appUser.displayName,
        data: { rating: reviewRating, comment: reviewComment },
      });
      const newReview: Review = {
        id,
        bookId: book.id,
        studentId: firebaseUser.uid,
        studentName: appUser.displayName,
        rating: reviewRating,
        comment: reviewComment,
        createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as Review['createdAt'],
        updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as Review['updatedAt'],
      };
      setMyReview(newReview);
      setReviews((prev) => [newReview, ...prev]);
      setShowReviewModal(false);
      toast.success('Review submitted!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!myReview || !firebaseUser || !book) return;
    try {
      await reviewService.delete({ reviewId: myReview.id, bookId: book.id, studentId: firebaseUser.uid });
      setMyReview(null);
      setReviews((prev) => prev.filter((r) => r.id !== myReview.id));
      toast.success('Review deleted');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete review');
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <Skeleton className="h-6 w-32 mb-6" />
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="page-container text-center py-24">
        <AlertCircle size={48} className="text-slate-600 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Book not found</h2>
        <p className="text-slate-400 mb-6">This book may have been removed or archived.</p>
        <Link to="/search" className="btn-primary">Browse Books</Link>
      </div>
    );
  }

  const availableCopies = copies.filter((c) => c.status === 'available');

  return (
    <div className="page-container animate-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-white transition-colors">Home</Link>
        <ChevronRight size={14} aria-hidden="true" />
        <Link to="/search" className="hover:text-white transition-colors">Books</Link>
        <ChevronRight size={14} aria-hidden="true" />
        <span className="text-slate-300 truncate" aria-current="page">{book.title}</span>
      </nav>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* ─── Main info ─────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cover + title */}
          <div className="flex gap-6">
            <div
              className="w-28 h-36 sm:w-36 sm:h-48 rounded-xl flex-shrink-0 flex items-center justify-center shadow-card"
              style={{
                background: `linear-gradient(135deg, ${book.coverColor ?? '#1e3a8a'}dd 0%, ${book.coverColor ?? '#1e3a8a'}66 100%)`,
              }}
            >
              <BookOpen size={40} className="text-white/40" />
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mb-1 leading-tight">
                {book.title}
              </h1>
              <p className="text-slate-400 text-base mb-3">{book.authors.join(', ')}</p>

              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="badge bg-slate-700 text-slate-300 border-slate-600">
                  <Tag size={10} />
                  {book.category}
                </span>
                <AvailabilityBadge
                  status={availableCopies.length > 0 ? 'available' : 'unavailable'}
                  count={availableCopies.length}
                />
                {book.edition && (
                  <span className="badge bg-slate-700/60 text-slate-400 border-slate-600/50">
                    {book.edition}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <StarDisplay rating={book.averageRating} />
                <span className="text-amber-400 font-semibold">
                  {book.averageRating > 0 ? book.averageRating.toFixed(1) : 'No ratings'}
                </span>
                <span className="text-slate-500 text-sm">
                  ({book.reviewCount} review{book.reviewCount !== 1 ? 's' : ''})
                </span>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="card p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: Hash, label: 'ISBN', value: book.isbn },
              { icon: Building, label: 'Publisher', value: book.publisher ?? '—' },
              { icon: Calendar, label: 'Year', value: book.publishYear?.toString() ?? '—' },
              { icon: Copy, label: 'Copies', value: `${book.availableCopies}/${book.totalCopies} avail.` },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="text-center">
                <Icon size={14} className="text-slate-500 mx-auto mb-1" />
                <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                <p className="text-sm font-medium text-slate-200 font-mono truncate">{value}</p>
              </div>
            ))}
          </div>

          {/* Description */}
          {book.description && (
            <div>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">Description</h2>
              <p className="text-slate-300 leading-relaxed text-sm">{book.description}</p>
            </div>
          )}

          {/* Keywords */}
          {book.keywords.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {book.keywords.map((k) => (
                <Link
                  key={k}
                  to={`/search?q=${encodeURIComponent(k)}`}
                  className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white px-2.5 py-1 rounded-full transition-all"
                >
                  {k}
                </Link>
              ))}
            </div>
          )}

          {/* Tabs: Copies / Reviews */}
          <div>
            <div
              className="flex border-b border-slate-700/50 mb-4"
              role="tablist"
              aria-label="Book information tabs"
            >
              {(['copies', 'reviews'] as const).map((tab) => (
                <button
                  key={tab}
                  role="tab"
                  id={`tab-${tab}`}
                  aria-selected={activeTab === tab}
                  aria-controls={`panel-${tab}`}
                  onClick={() => setActiveTab(tab)}
                  className={clsx(
                    'px-4 py-2 text-sm font-medium transition-colors capitalize border-b-2 -mb-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 focus-visible:ring-offset-surface-900',
                    activeTab === tab
                      ? 'border-primary-500 text-primary-400'
                      : 'border-transparent text-slate-500 hover:text-white'
                  )}
                >
                  {tab === 'copies' ? `Physical Copies (${copies.length})` : `Reviews (${reviews.length})`}
                </button>
              ))}
            </div>

            <div
              id="panel-copies"
              role="tabpanel"
              aria-labelledby="tab-copies"
              hidden={activeTab !== 'copies'}
            >
              <div className={clsx('space-y-3', activeTab === 'copies' && 'animate-in')}>
                {copies.length === 0 ? (
                  <div className="card p-8 text-center">
                    <Copy size={32} className="text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-400">No physical copies registered yet.</p>
                  </div>
                ) : (
                  copies.map((copy, i) => (
                    <LocationCard key={copy.id} copy={copy} index={i} />
                  ))
                )}
              </div>
            </div>

            <div
              id="panel-reviews"
              role="tabpanel"
              aria-labelledby="tab-reviews"
              hidden={activeTab !== 'reviews'}
            >
              <div className={clsx('space-y-4', activeTab === 'reviews' && 'animate-in')}>
                {firebaseUser && (
                  <div className="card p-4 flex items-center justify-between">
                    {myReview ? (
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-sm text-slate-300">You reviewed this book</p>
                          <StarDisplay rating={myReview.rating} size={14} />
                        </div>
                        <button
                          className="btn-ghost btn-sm text-red-400 hover:text-red-300 ml-auto"
                          onClick={handleDeleteReview}
                        >
                          Delete my review
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-slate-400">Share your thoughts on this book</p>
                        <button className="btn-outline btn-sm" onClick={() => setShowReviewModal(true)}>
                          Write a Review
                        </button>
                      </>
                    )}
                  </div>
                )}

                {reviews.length === 0 ? (
                  <div className="card p-8 text-center">
                    <Star size={32} className="text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-400">No reviews yet. Be the first!</p>
                  </div>
                ) : (
                  reviews.map((r) => (
                    <div key={r.id} className="card p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary-600/30 flex items-center justify-center">
                            <User size={13} className="text-primary-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{r.studentName}</p>
                            <StarDisplay rating={r.rating} size={12} />
                          </div>
                        </div>
                        <span className="text-xs text-slate-600">
                          {r.createdAt?.toDate?.()?.toLocaleDateString() ?? ''}
                        </span>
                      </div>
                      <p className="text-slate-300 text-sm">{r.comment}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Sidebar ───────────────────────────────── */}
        <div className="space-y-4">
          {/* Action card */}
          <div className="card p-5">
            <h3 className="font-semibold text-white mb-3">Book Status</h3>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Total copies</span>
                <span className="text-white font-medium">{copies.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Available</span>
                <span className="text-emerald-400 font-medium">{availableCopies.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Borrowed</span>
                <span className="text-amber-400 font-medium">
                  {copies.filter((c) => c.status === 'borrowed').length}
                </span>
              </div>
            </div>

            {firebaseUser ? (
              availableCopies.length > 0 ? (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-400 text-center">
                  Available — visit the library!
                </div>
              ) : hasActiveReservation ? (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-400 text-center">
                  <Bookmark size={14} className="inline mr-1" />
                  Reservation active
                </div>
              ) : (
                <button
                  className="btn-primary w-full"
                  onClick={handleReserve}
                  disabled={reserving}
                  id="reserve-book-btn"
                >
                  {reserving ? 'Reserving…' : 'Request Reservation'}
                </button>
              )
            ) : (
              <Link to="/login" className="btn-outline w-full text-center block">
                Sign in to Reserve
              </Link>
            )}
          </div>

          {/* Back button */}
          <Link to="/search" className="btn-ghost btn-sm w-full justify-center">
            <ArrowLeft size={14} />
            Back to Search
          </Link>

          {/* Related books */}
          {related.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-300 mb-3 text-sm uppercase tracking-wide">Related Books</h3>
              <div className="space-y-3">
                {related.map((b) => (
                  <Link key={b.id} to={`/books/${b.id}`} className="flex gap-3 card p-3 hover:border-slate-600 transition-all group">
                    <div
                      className="w-10 h-12 rounded flex items-center justify-center flex-shrink-0"
                      style={{ background: b.coverColor ?? '#1e3a8a' }}
                    >
                      <BookOpen size={16} className="text-white/50" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white group-hover:text-primary-400 transition-colors line-clamp-2">{b.title}</p>
                      <p className="text-xs text-slate-500 truncate">{b.authors[0]}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Related books grid (wider viewport) */}
      {related.length > 0 && (
        <div className="mt-12">
          <h2 className="section-title mb-6">You Might Also Like</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
            {related.map((b) => <BookCard key={b.id} book={b} />)}
          </div>
        </div>
      )}

      {/* Review modal */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title="Write a Review"
      >
        <div className="space-y-4">
          <div>
            <p className="label mb-2">Your Rating</p>
            <StarPicker value={reviewRating} onChange={setReviewRating} />
          </div>
          <div>
            <label className="label" htmlFor="review-comment">Your Review</label>
            <textarea
              id="review-comment"
              className="input resize-none"
              rows={4}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Share what you thought about this book… (min 10 characters)"
            />
            <p className="text-xs text-slate-600 mt-1">{reviewComment.length}/1000</p>
          </div>
          <div className="flex gap-3 justify-end">
            <button className="btn-secondary btn-sm" onClick={() => setShowReviewModal(false)}>
              Cancel
            </button>
            <button className="btn-primary btn-sm" onClick={handleSubmitReview} disabled={submittingReview}>
              {submittingReview ? 'Submitting…' : 'Submit Review'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
