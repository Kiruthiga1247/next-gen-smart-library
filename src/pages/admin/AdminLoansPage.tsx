import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeftRight, Search, CheckCircle } from 'lucide-react';
import { AdminSidebar } from '../../components/layout/AdminSidebar';
import { Modal } from '../../components/ui/Modal';
import { FormField, Input, Select } from '../../components/ui/FormField';
import { AvailabilityBadge } from '../../components/ui/AvailabilityBadge';
import { TableRowSkeleton } from '../../components/ui/Skeleton';
import { Pagination } from '../../components/ui/Pagination';
import { loanService } from '../../services/loanService';
import { copyService } from '../../services/copyService';
import { bookService } from '../../services/bookService';
import { issueBookSchema, type IssueBookFormData } from '../../schemas';
import type { Loan, BookCopy, Book } from '../../types';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { AppUser } from '../../types';

const PAGE_SIZE = 15;

export function AdminLoansPage() {
  const { appUser } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [availableCopies, setAvailableCopies] = useState<(BookCopy & { book: Book })[]>([]);
  const [students, setStudents] = useState<AppUser[]>([]);
  const [page, setPage] = useState(1);
  const [issuing, setIssuing] = useState(false);
  const [returning, setReturning] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<IssueBookFormData>({ resolver: zodResolver(issueBookSchema) });

  const fetchLoans = () => {
    setLoading(true);
    loanService.getAll().then(setLoans).finally(() => setLoading(false));
  };

  useEffect(() => { fetchLoans(); }, []);

  const openIssueModal = async () => {
    const [copies, allBooks, usersSnap] = await Promise.all([
      copyService.getByStatus('available'),
      bookService.getAll(false),
      getDocs(query(collection(db, 'users'), where('role', '==', 'student'))),
    ]);
    const bookMap = new Map(allBooks.map((b) => [b.id, b]));
    const copiesWithBook = copies
      .filter((c) => bookMap.has(c.bookId))
      .map((c) => ({ ...c, book: bookMap.get(c.bookId)! }));

    setAvailableCopies(copiesWithBook);
    setStudents(usersSnap.docs.map((d) => ({ uid: d.id, ...d.data() } as AppUser)));
    reset({});
    setShowIssueModal(true);
  };

  const onIssue = async (data: IssueBookFormData) => {
    if (!appUser) return;
    setIssuing(true);
    try {
      const copy = availableCopies.find((c) => c.id === data.copyId);
      const student = students.find((s) => s.uid === data.studentId);
      if (!copy || !student) throw new Error('Invalid selection');

      await loanService.issue({
        copyId: copy.id,
        bookId: copy.bookId,
        studentId: student.uid,
        studentName: student.displayName,
        studentEmail: student.email,
        bookTitle: copy.book.title,
        accessionNumber: copy.accessionNumber,
        issuedBy: appUser.uid,
        dueDays: 14,
      });

      toast.success(`Issued "${copy.book.title}" to ${student.displayName}`);
      setShowIssueModal(false);
      fetchLoans();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to issue');
    } finally {
      setIssuing(false);
    }
  };

  const handleReturn = async (loan: Loan) => {
    if (!appUser) return;
    setReturning(loan.id);
    try {
      await loanService.return({ loanId: loan.id, returnedBy: appUser.uid });
      toast.success(`"${loan.bookTitle}" returned successfully`);
      fetchLoans();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to process return');
    } finally {
      setReturning(null);
    }
  };

  const filtered = loans.filter((l) => {
    const q = searchQuery.toLowerCase();
    return !q ||
      l.bookTitle.toLowerCase().includes(q) ||
      l.studentName.toLowerCase().includes(q) ||
      l.accessionNumber.toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selectedCopyId = watch('copyId');
  const selectedCopy = availableCopies.find((c) => c.id === selectedCopyId);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 14);
  const defaultDueDate = tomorrow.toISOString().slice(0, 10);

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-content animate-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-xl font-bold text-white">Issue / Return</h1>
            <p className="text-slate-500 text-sm">{filtered.length} loan records</p>
          </div>
          <button id="issue-book-btn" className="btn-primary btn-sm" onClick={openIssueModal}>
            <ArrowLeftRight size={15} /> Issue Book
          </button>
        </div>

        <div className="flex gap-3 mb-4">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              placeholder="Search student, book, accession…"
              className="input pl-8 h-9 text-sm"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/50 border-b border-slate-700/50">
                <tr>
                  {['Book', 'Student', 'Accession #', 'Issued', 'Due', 'Status', 'Action'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">No loan records</td>
                  </tr>
                ) : (
                  paged.map((loan) => {
                    const isActive = loan.status === 'active' || loan.status === 'overdue';
                    return (
                      <tr key={loan.id} className="border-b border-slate-700/30 hover:bg-slate-800/30">
                        <td className="px-4 py-3 text-white max-w-[160px] truncate">{loan.bookTitle}</td>
                        <td className="px-4 py-3 text-slate-400">{loan.studentName}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-300">{loan.accessionNumber}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">
                          {loan.issuedAt?.toDate?.()?.toLocaleDateString() ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className={loan.status === 'overdue' ? 'text-red-400' : 'text-slate-400'}>
                            {loan.dueAt?.toDate?.()?.toLocaleDateString() ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3"><AvailabilityBadge status={loan.status} /></td>
                        <td className="px-4 py-3">
                          {isActive && (
                            <button
                              className="btn-success btn-sm !py-1"
                              onClick={() => handleReturn(loan)}
                              disabled={returning === loan.id}
                              id={`return-btn-${loan.id}`}
                            >
                              <CheckCircle size={13} />
                              {returning === loan.id ? 'Processing…' : 'Return'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
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

        {/* Issue modal */}
        <Modal isOpen={showIssueModal} onClose={() => setShowIssueModal(false)} title="Issue Book to Student" size="md">
          <form onSubmit={handleSubmit(onIssue)} className="space-y-4">
            <FormField label="Available Copy" error={errors.copyId?.message} required id="issue-copy">
              <Select
                id="issue-copy"
                options={availableCopies.map((c) => ({
                  value: c.id,
                  label: `${c.accessionNumber} — ${c.book.title.slice(0, 50)} (${c.rackId}/${c.rowNumber}/${c.shelfId})`,
                }))}
                placeholder="Select a copy"
                error={!!errors.copyId}
                {...register('copyId')}
              />
            </FormField>

            {selectedCopy && (
              <div className="bg-slate-800/60 rounded-lg p-3 text-sm">
                <p className="text-white font-medium">{selectedCopy.book.title}</p>
                <p className="text-slate-400 text-xs font-mono mt-1">
                  {selectedCopy.rackId} / Row {selectedCopy.rowNumber} / {selectedCopy.shelfId}
                </p>
              </div>
            )}

            <FormField label="Student" error={errors.studentId?.message} required id="issue-student">
              <Select
                id="issue-student"
                options={students.map((s) => ({
                  value: s.uid,
                  label: `${s.displayName} (${s.email})`,
                }))}
                placeholder="Select student"
                error={!!errors.studentId}
                {...register('studentId')}
              />
            </FormField>

            <FormField label="Due Date" error={errors.dueDate?.message} required id="issue-due">
              <Input
                id="issue-due"
                type="date"
                defaultValue={defaultDueDate}
                min={new Date().toISOString().slice(0, 10)}
                error={!!errors.dueDate}
                {...register('dueDate')}
              />
            </FormField>

            <div className="flex gap-3 justify-end pt-2">
              <button type="button" className="btn-secondary btn-sm" onClick={() => setShowIssueModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary btn-sm" disabled={issuing}>
                {issuing ? 'Issuing…' : 'Issue Book'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}
