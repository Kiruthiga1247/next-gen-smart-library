import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { AdminSidebar } from '../../components/layout/AdminSidebar';
import { Modal, ConfirmModal } from '../../components/ui/Modal';
import { FormField, Input, Select } from '../../components/ui/FormField';
import { AvailabilityBadge } from '../../components/ui/AvailabilityBadge';
import { TableRowSkeleton } from '../../components/ui/Skeleton';
import { Pagination } from '../../components/ui/Pagination';
import { copyService } from '../../services/copyService';
import { bookService } from '../../services/bookService';
import { bookCopySchema, type BookCopyFormData } from '../../schemas';
import type { BookCopy, Book } from '../../types';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { auditService } from '../../services/auditService';

const STATUS_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'borrowed', label: 'Borrowed' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'maintenance', label: 'Maintenance' },
];

const PAGE_SIZE = 15;

export function AdminCopiesPage() {
  const { appUser } = useAuth();
  const [copies, setCopies] = useState<BookCopy[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBookId, setFilterBookId] = useState('');
  const [modalCopy, setModalCopy] = useState<BookCopy | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<BookCopy | null>(null);
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BookCopyFormData>({ resolver: zodResolver(bookCopySchema) });

  useEffect(() => {
    Promise.all([copyService.getAll(), bookService.getAll(false)]).then(([c, b]) => {
      setCopies(c);
      setBooks(b);
    }).finally(() => setLoading(false));
  }, []);

  const bookOptions = [
    { value: '', label: 'All books' },
    ...books.map((b) => ({ value: b.id, label: b.title.slice(0, 60) })),
  ];

  const filtered = copies.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery = !q || c.accessionNumber.toLowerCase().includes(q) || c.rackId.toLowerCase().includes(q);
    const matchesBook = !filterBookId || c.bookId === filterBookId;
    return matchesQuery && matchesBook;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const getBookTitle = (bookId: string) => books.find((b) => b.id === bookId)?.title ?? bookId;

  const openAdd = () => {
    reset({ status: 'available' });
    setModalCopy(null);
  };

  const openEdit = (copy: BookCopy) => {
    reset({
      bookId: copy.bookId,
      accessionNumber: copy.accessionNumber,
      rackId: copy.rackId,
      rowNumber: copy.rowNumber,
      shelfId: copy.shelfId,
      status: copy.status,
      condition: copy.condition,
      notes: copy.notes,
    });
    setModalCopy(copy);
  };

  const onSubmit = async (data: BookCopyFormData) => {
    setSaving(true);
    try {
      if (modalCopy) {
        await copyService.update(modalCopy.id, data);
        // Update book copy counts
        const counts = await copyService.countByBook(data.bookId);
        await bookService.updateCounts(data.bookId, counts.total, counts.available);

        setCopies((prev) => prev.map((c) => c.id === modalCopy.id ? { ...c, ...data } : c));
        await auditService.log({ actorId: appUser!.uid, actorName: appUser!.displayName, action: 'copy.updated', targetType: 'bookCopy', targetId: modalCopy.id });
        toast.success('Copy updated');
      } else {
        const id = await copyService.create(data);
        const counts = await copyService.countByBook(data.bookId);
        await bookService.updateCounts(data.bookId, counts.total, counts.available);

        const newCopies = await copyService.getAll();
        setCopies(newCopies);
        await auditService.log({ actorId: appUser!.uid, actorName: appUser!.displayName, action: 'copy.created', targetType: 'bookCopy', targetId: id });
        toast.success('Copy added');
      }
      setModalCopy(undefined);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !appUser) return;
    try {
      await copyService.delete(deleteTarget.id);
      const counts = await copyService.countByBook(deleteTarget.bookId);
      await bookService.updateCounts(deleteTarget.bookId, counts.total, counts.available);
      setCopies((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      await auditService.log({ actorId: appUser.uid, actorName: appUser.displayName, action: 'copy.deleted', targetType: 'bookCopy', targetId: deleteTarget.id });
      toast.success('Copy deleted');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-content animate-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-xl font-bold text-white">Physical Copies</h1>
            <p className="text-slate-500 text-sm">{filtered.length} copies</p>
          </div>
          <button id="add-copy-btn" className="btn-primary btn-sm" onClick={openAdd}>
            <Plus size={15} /> Add Copy
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-40">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              placeholder="Search accession, rack…"
              className="input pl-8 h-9 text-sm"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="input h-9 text-sm !w-auto min-w-[180px]"
            value={filterBookId}
            onChange={(e) => { setFilterBookId(e.target.value); setPage(1); }}
          >
            {bookOptions.map((o) => (
              <option key={o.value} value={o.value} className="bg-slate-800">{o.label}</option>
            ))}
          </select>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/50 border-b border-slate-700/50">
                <tr>
                  {['Accession #', 'Book', 'Location', 'Status', 'Condition', 'Actions'].map((h) => (
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
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500">No copies found</td>
                  </tr>
                ) : (
                  paged.map((copy) => (
                    <tr key={copy.id} className="border-b border-slate-700/30 hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-mono font-semibold text-white">{copy.accessionNumber}</td>
                      <td className="px-4 py-3 text-slate-400 max-w-[160px] truncate">{getBookTitle(copy.bookId)}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-slate-300">
                          {copy.rackId} / {copy.rowNumber} / {copy.shelfId}
                        </span>
                      </td>
                      <td className="px-4 py-3"><AvailabilityBadge status={copy.status} /></td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{copy.condition ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button className="btn-ghost btn-sm !px-2 !py-1" onClick={() => openEdit(copy)} title="Edit">
                            <Edit2 size={13} />
                          </button>
                          <button className="btn-ghost btn-sm !px-2 !py-1 text-red-400" onClick={() => setDeleteTarget(copy)} title="Delete">
                            <Trash2 size={13} />
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

        {/* Add/Edit Modal */}
        {modalCopy !== undefined && (
          <Modal
            isOpen
            onClose={() => setModalCopy(undefined)}
            title={modalCopy ? 'Edit Copy' : 'Add Physical Copy'}
            size="md"
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <FormField label="Book" error={errors.bookId?.message} required id="copy-book">
                <Select
                  id="copy-book"
                  options={books.map((b) => ({ value: b.id, label: b.title.slice(0, 70) }))}
                  placeholder="Select a book"
                  error={!!errors.bookId}
                  {...register('bookId')}
                />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Accession #" error={errors.accessionNumber?.message} required id="copy-accession" hint="Format: LIB-1001">
                  <Input id="copy-accession" error={!!errors.accessionNumber} {...register('accessionNumber')} placeholder="LIB-1001" />
                </FormField>
                <FormField label="Status" error={errors.status?.message} required id="copy-status">
                  <Select id="copy-status" options={STATUS_OPTIONS} error={!!errors.status} {...register('status')} />
                </FormField>
                <FormField label="Rack ID" error={errors.rackId?.message} required id="copy-rack" hint="Format: R-01">
                  <Input id="copy-rack" error={!!errors.rackId} {...register('rackId')} placeholder="R-01" />
                </FormField>
                <FormField label="Row Number" error={errors.rowNumber?.message} required id="copy-row" hint="Format: 01">
                  <Input id="copy-row" error={!!errors.rowNumber} {...register('rowNumber')} placeholder="01" />
                </FormField>
                <FormField label="Shelf ID" error={errors.shelfId?.message} required id="copy-shelf" hint="Format: S-01">
                  <Input id="copy-shelf" error={!!errors.shelfId} {...register('shelfId')} placeholder="S-01" />
                </FormField>
                <FormField label="Condition" id="copy-condition">
                  <Input id="copy-condition" {...register('condition')} placeholder="Good / Fair / Poor" />
                </FormField>
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" className="btn-secondary btn-sm" onClick={() => setModalCopy(undefined)}>Cancel</button>
                <button type="submit" className="btn-primary btn-sm" disabled={saving}>
                  {saving ? 'Saving…' : (modalCopy ? 'Save Changes' : 'Add Copy')}
                </button>
              </div>
            </form>
          </Modal>
        )}

        <ConfirmModal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="Delete Copy"
          message={`Permanently delete copy ${deleteTarget?.accessionNumber}? This cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
        />
      </div>
    </div>
  );
}
