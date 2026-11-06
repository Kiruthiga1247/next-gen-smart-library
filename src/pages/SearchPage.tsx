import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, BookOpen, X } from 'lucide-react';
import { SearchBar } from '../components/ui/SearchBar';
import { BookCard } from '../components/ui/BookCard';
import { BookCardSkeleton } from '../components/ui/Skeleton';
import { Pagination } from '../components/ui/Pagination';
import { Select } from '../components/ui/FormField';
import { bookService } from '../services/bookService';
import { searchService } from '../services/searchService';
import { BOOK_CATEGORIES } from '../data/sampleData';
import type { Book, SearchFilters } from '../types';

const PAGE_SIZE = 12;

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  ...BOOK_CATEGORIES.map((c) => ({ value: c, label: c })),
];

const AVAILABILITY_OPTIONS = [
  { value: 'all', label: 'Any Availability' },
  { value: 'available', label: 'Available Now' },
  { value: 'unavailable', label: 'Unavailable' },
];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'newest', label: 'Newest First' },
];

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const query = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? 'all';
  const availability = (searchParams.get('availability') ?? 'all') as SearchFilters['availability'];
  const sortBy = (searchParams.get('sort') ?? 'relevance') as SearchFilters['sortBy'];

  useEffect(() => {
    setLoading(true);
    bookService.getAll(false).then((books) => {
      setAllBooks(books);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filteredBooks = useMemo(() => {
    return searchService.search(allBooks, {
      query,
      category: category === 'all' ? undefined : category,
      availability,
      sortBy,
    });
  }, [allBooks, query, category, availability, sortBy]);

  const totalPages = Math.ceil(filteredBooks.length / PAGE_SIZE);
  const pagedBooks = filteredBooks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const updateParam = useCallback((key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === 'all' || value === 'relevance' || value === '') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      return next;
    });
    setPage(1);
  }, [setSearchParams]);

  const handleSearch = useCallback((q: string) => {
    updateParam('q', q);
  }, [updateParam]);

  const clearFilters = () => {
    setSearchParams({ q: query });
    setPage(1);
  };

  const hasActiveFilters = category !== 'all' || availability !== 'all' || sortBy !== 'relevance';

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-white mb-4">
          {query ? (
            <>Search results for <span className="text-primary-400">"{query}"</span></>
          ) : (
            'Browse Books'
          )}
        </h1>
        <SearchBar
          defaultValue={query}
          onSearch={handleSearch}
          size="md"
          className="max-w-2xl"
        />
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          id="toggle-filters-btn"
          className={`btn-sm flex items-center gap-2 ${showFilters ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setShowFilters((v) => !v)}
        >
          <Filter size={14} />
          Filters
          {hasActiveFilters && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          )}
        </button>

        <Select
          options={SORT_OPTIONS}
          value={sortBy}
          onChange={(e) => updateParam('sort', e.target.value)}
          className="!w-auto !py-1.5 !text-xs"
        />

        {!loading && (
          <span className="text-slate-500 text-sm ml-auto">
            {filteredBooks.length} result{filteredBooks.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="card p-4 mb-6 animate-slide-down">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-40">
              <label className="label">Category</label>
              <Select
                options={CATEGORY_OPTIONS}
                value={category}
                onChange={(e) => updateParam('category', e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-40">
              <label className="label">Availability</label>
              <Select
                options={AVAILABILITY_OPTIONS}
                value={availability ?? 'all'}
                onChange={(e) => updateParam('availability', e.target.value)}
              />
            </div>
            {hasActiveFilters && (
              <button className="btn-ghost btn-sm flex items-center gap-1.5 text-red-400 hover:text-red-300" onClick={clearFilters}>
                <X size={13} />
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {hasActiveFilters && !showFilters && (
        <div className="flex flex-wrap gap-2 mb-4">
          {category !== 'all' && (
            <span className="badge bg-primary-500/20 text-primary-400 border border-primary-500/30">
              {category}
              <button onClick={() => updateParam('category', 'all')} className="ml-1 hover:text-white">
                <X size={10} />
              </button>
            </span>
          )}
          {availability !== 'all' && (
            <span className="badge bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {availability === 'available' ? 'Available Now' : 'Unavailable'}
              <button onClick={() => updateParam('availability', 'all')} className="ml-1 hover:text-white">
                <X size={10} />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => <BookCardSkeleton key={i} />)}
        </div>
      ) : pagedBooks.length > 0 ? (
        <>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 animate-in">
            {pagedBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
          <div className="flex justify-center mt-8">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </>
      ) : (
        <div className="card p-16 text-center animate-in">
          <BookOpen size={48} className="text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No books found</h3>
          <p className="text-slate-400 text-sm mb-4">
            {query
              ? `No results for "${query}". Try different keywords, check spelling, or remove filters.`
              : 'No books match the selected filters.'}
          </p>
          <div className="flex gap-3 justify-center">
            {hasActiveFilters && (
              <button className="btn-outline btn-sm" onClick={clearFilters}>
                Clear filters
              </button>
            )}
            {query && (
              <button className="btn-ghost btn-sm" onClick={() => updateParam('q', '')}>
                Browse all books
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
