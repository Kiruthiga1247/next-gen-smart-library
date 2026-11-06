import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Edit2, Archive, ArchiveRestore, Search, BookOpen } from 'lucide-react';
import { AdminSidebar } from '../../components/layout/AdminSidebar';
import { Modal, ConfirmModal } from '../../components/ui/Modal';
import { FormField, Input, Textarea, Select } from '../../components/ui/FormField';
import { AvailabilityBadge } from '../../components/ui/AvailabilityBadge';
import { Pagination } from '../../components/ui/Pagination';
import { TableRowSkeleton } from '../../components/ui/Skeleton';
import { bookService } from '../../services/bookService';
import { bookSchema, type BookFormData } from '../../schemas';
import { BOOK_CATEGORIES } from '../../data/sampleData';
import type { Book } from '../../types';
import toast from 'react-hot-toast';
import { auditService } from '../../services/auditService';
import { useAuth } from '../../contexts/AuthContext';

const PAGE_SIZE = 10;

const CATEGORY_OPTIONS = BOOK_CATEGORIES.map((c) => ({ value: c, label: c }));

function BookFormModal({
  isOpen,
  onClose,
  onSaved,
  book,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (book: Book) => void;
  book: Book | null;
}) {
  const { appUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BookFormData>({ resolver: zodResolver(bookSchema) });

  useEffect(() => {
    if (book) {
      reset({
        title: book.title,
        authors: book.authors.join(', '),
        isbn: book.isbn,
        category: book.category,
        edition: book.edition,
        publisher: book.publisher,
        publishYear: book.publishYear,
        description: book.description,
        keywords: book.keywords.join(', '),
        language: book.language ?? 'English',
        pageCount: book.pageCount,
      });
    } else {
      reset({});
    }
  }, [book, reset]);

  const onSubmit = async (data: BookFormData) => {
    setLoading(true);
    try {
      if (book) {
        await bookService.update(book.id, data);
        await auditService.log({
          actorId: appUser!.uid,
          actorName: appUser!.displayName,
          action: 'book.updated',
          targetType: 'book',
          targetId: book.id,
        });
        toast.success('Book updated');
        onSaved({ ...book, ...data, authors: data.authors.split(',').map((a) => a.trim()), keywords: (data.keywords ?? '').split(',').map((k) => k.trim()) });
      } else {
        const id = await bookService.create(data);
        await auditService.log({
          actorId: appUser!.uid,
          actorName: appUser!.displayName,
          action: 'book.created',
          targetType: 'book',
          targetId: id,
        });
        const newBook = await bookService.getById(id);
        toast.success('Book added');
        if (newBook) onSaved(newBook);
      }
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={book ? 'Edit Book' : 'Add New Book'} size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <FormField label="Title" error={errors.title?.message} required id="book-title" className="sm:col-span-2">
            <Input id="book-title" error={!!errors.title} {...register('title')} placeholder="Book title" />
          </FormField>
          <FormField label="Authors" error={errors.authors?.message} required id="book-authors" hint="Comma-separated">
            <Input id="book-authors" error={!!errors.authors} {...register('authors')} placeholder="Author 1, Author 2" />
          </FormField>
          <FormField label="ISBN" error={errors.isbn?.message} required id="book-isbn">
            <Input id="book-isbn" error={!!errors.isbn} {...register('isbn')} placeholder="978-0-000-00000-0" />
          </FormField>
          <FormField label="Category" error={errors.category?.message} required id="book-category">
            <Select id="book-category" options={CATEGORY_OPTIONS} placeholder="Select category" error={!!errors.category} {...register('category')} />
          </FormField>
          <FormField label="Edition" error={errors.edition?.message} id="book-edition">
            <Input id="book-edition" {...register('edition')} placeholder="e.g. 4th Edition" />
          </FormField>
          <FormField label="Publisher" error={errors.publisher?.message} id="book-publisher">
            <Input id="book-publisher" {...register('publisher')} placeholder="Publisher name" />
          </FormField>
          <FormField label="Publish Year" error={errors.publishYear?.message} id="book-year">
            <Input id="book-year" type="number" {...register('publishYear')} placeholder="2024" />
          </FormField>
          <FormField label="Page Count" error={errors.pageCount?.message} id="book-pages">
            <Input id="book-pages" type="number" {...register('pageCount')} placeholder="350" />
          </FormField>
          <FormField label="Keywords" error={errors.keywords?.message} id="book-keywords" hint="Comma-separated" className="sm:col-span-2">
            <Input id="book-keywords" {...register('keywords')} placeholder="algorithms, data structures, complexity" />
          </FormField>
          <FormField label="Description" error={errors.description?.message} id="book-desc" className="sm:col-span-2">
            <Textarea id="book-desc" {...register('description')} rows={3} placeholder="Brief description of the book" />
          </FormField>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <button type="button" className="btn-secondary btn-sm" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary btn-sm" disabled={loading}>
            {loading ? 'Saving…' : (book ? 'Save Changes' : 'Add Book')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function AdminBooksPage() {
  const { appUser } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [modalBook, setModalBook] = useState<Book | null | undefined>(undefined);
  const [archiveTarget, setArchiveTarget] = useState<Book | null>(null);
  const [page, setPage] = useState(1);

  const fetchBooks = () => {
    setLoading(true);
    bookService.getAll(showArchived).then(setBooks).finally(() => setLoading(false));
  };

  useEffect(() => { fetchBooks(); }, [showArchived]);

  const filtered = books.filter((b) => {
    const q = searchQuery.toLowerCase();
    return !q || b.title.toLowerCase().includes(q) || b.authors.some((a) => a.toLowerCase().includes(q)) || b.isbn.includes(q);
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSaved = (saved: Book) => {
    setBooks((prev) => {
      const idx = prev.findIndex((b) => b.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTarget || !appUser) return;
    try {
      if (archiveTarget.isArchived) {
        await bookService.unarchive(archiveTarget.id);
        toast.success('Book restored');
      } else {
        await bookService.archive(archiveTarget.id);
        toast.success('Book archived');
      }
      await auditService.log({
        actorId: appUser.uid,
        actorName: appUser.displayName,
        action: archiveTarget.isArchived ? 'book.updated' : 'book.archived',
        targetType: 'book',
        targetId: archiveTarget.id,
      });
      fetchBooks();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setArchiveTarget(null);
    }
  };

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-content animate-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-xl font-bold text-white">Books</h1>
            <p className="text-slate-500 text-sm">{filtered.length} titles</p>
          </div>
          <button
            id="add-book-btn"
            className="btn-primary btn-sm"
            onClick={() => setModalBook(null)}
          >
            <Plus size={15} /> Add Book
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              placeholder="Search books…"
              className="input pl-8 h-9 text-sm"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-slate-600 bg-slate-800 text-primary-600"
            />
            Show archived
          </label>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/50 border-b border-slate-700/50">
                <tr>
                  {['Title', 'Authors', 'Category', 'Copies', 'Status', 'Actions'].map((h) => (
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
                      <BookOpen size={28} className="mx-auto mb-2 text-slate-700" />
                      No books found
                    </td>
                  </tr>
                ) : (
                  paged.map((book) => (
                    <tr key={book.id} className="border-b border-slate-700/30 hover:bg-slate-800/30">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-white max-w-xs truncate">{book.title}</p>
                          <p className="text-xs text-slate-500 font-mono">{book.isbn}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400 max-w-[150px] truncate">
                        {book.authors.join(', ')}
                      </td>
                      <td className="px-4 py-3">
                        <span className="badge bg-slate-700/60 text-slate-300 border-slate-600/50 text-xs">
                          {book.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-emerald-400 font-medium">{book.availableCopies}</span>
                        <span className="text-slate-600">/{book.totalCopies}</span>
                      </td>
                      <td className="px-4 py-3">
                        {book.isArchived
                          ? <span className="badge badge-cancelled">Archived</span>
                          : <AvailabilityBadge status={book.availableCopies > 0 ? 'available' : 'borrowed'} />
                        }
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            className="btn-ghost btn-sm !px-2 !py-1"
                            title="Edit"
                            onClick={() => setModalBook(book)}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="btn-ghost btn-sm !px-2 !py-1 text-amber-400"
                            title={book.isArchived ? 'Restore' : 'Archive'}
                            onClick={() => setArchiveTarget(book)}
                          >
                            {book.isArchived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                          </button>
                        </div>
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

        {modalBook !== undefined && (
          <BookFormModal
            isOpen
            onClose={() => setModalBook(undefined)}
            onSaved={handleSaved}
            book={modalBook}
          />
        )}

        <ConfirmModal
          isOpen={!!archiveTarget}
          onClose={() => setArchiveTarget(null)}
          onConfirm={handleArchiveConfirm}
          title={archiveTarget?.isArchived ? 'Restore Book' : 'Archive Book'}
          message={`${archiveTarget?.isArchived ? 'Restore' : 'Archive'} "${archiveTarget?.title}"?`}
          confirmLabel={archiveTarget?.isArchived ? 'Restore' : 'Archive'}
          variant="warning"
        />
      </div>
    </div>
  );
}
