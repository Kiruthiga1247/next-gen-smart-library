import { useState, useRef } from 'react';
import { Upload, Download, FileText, AlertCircle, CheckCircle, X, BookOpen } from 'lucide-react';
import { AdminSidebar } from '../../components/layout/AdminSidebar';
import { bookService } from '../../services/bookService';
import { csvService } from '../../services/csvService';
import type { CsvImportResult } from '../../types';
import toast from 'react-hot-toast';

export function AdminImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [progress, setProgress] = useState<{ row: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }
    setFile(f);
    setResult(null);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setResult(null);
    setProgress(null);

    try {
      const result = await csvService.importBooks(file, (row, total) => {
        setProgress({ row, total });
      });
      setResult(result);
      if (result.imported > 0) {
        toast.success(`Imported ${result.imported} book${result.imported !== 1 ? 's' : ''}`);
      }
      if (result.skipped > 0) {
        toast.error(`${result.skipped} rows skipped (see errors below)`);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
      setProgress(null);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const books = await bookService.getAll(false);
      csvService.exportBooks(books);
      toast.success(`Exported ${books.length} books`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-content animate-in max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <Upload size={22} className="text-primary-400" />
          <div>
            <h1 className="font-display text-xl font-bold text-white">CSV Import / Export</h1>
            <p className="text-slate-500 text-sm">Bulk manage your book catalogue</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 mb-8">
          {/* Import Card */}
          <div className="card p-6">
            <h2 className="font-semibold text-white mb-1 flex items-center gap-2">
              <Upload size={16} className="text-primary-400" />
              Import Books
            </h2>
            <p className="text-slate-500 text-sm mb-4">
              Upload a CSV file with book data. Required columns: title, authors, isbn, category.
            </p>

            <div
              className="border-2 border-dashed border-slate-600 hover:border-primary-500 rounded-xl p-6 text-center transition-colors cursor-pointer mb-4"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileText size={28} className="text-slate-600 mx-auto mb-2" />
              {file ? (
                <div>
                  <p className="text-white font-medium">{file.name}</p>
                  <p className="text-slate-500 text-xs">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <>
                  <p className="text-slate-400 text-sm">Click to select CSV file</p>
                  <p className="text-slate-600 text-xs">or drag and drop</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                id="csv-file-input"
                onChange={handleFileChange}
              />
            </div>

            {progress && (
              <div className="mb-4">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Importing…</span>
                  <span>{progress.row}/{progress.total}</span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 transition-all duration-200"
                    style={{ width: `${(progress.row / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                id="import-btn"
                className="btn-primary btn-sm flex-1 justify-center"
                onClick={handleImport}
                disabled={!file || importing}
              >
                {importing ? 'Importing…' : 'Import'}
              </button>
              {file && (
                <button className="btn-ghost btn-sm !px-2" onClick={handleReset} title="Clear">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Export Card */}
          <div className="card p-6">
            <h2 className="font-semibold text-white mb-1 flex items-center gap-2">
              <Download size={16} className="text-emerald-400" />
              Export Catalogue
            </h2>
            <p className="text-slate-500 text-sm mb-4">
              Download all non-archived books as a CSV file with full metadata.
            </p>
            <button
              id="export-btn"
              className="btn-success btn-md w-full justify-center mb-3"
              onClick={handleExport}
              disabled={exporting}
            >
              <Download size={15} />
              {exporting ? 'Exporting…' : 'Export All Books'}
            </button>

            <div className="border-t border-slate-700/50 pt-3">
              <p className="text-slate-500 text-xs mb-2">Need the import template?</p>
              <button
                className="btn-outline btn-sm w-full justify-center"
                onClick={() => csvService.downloadTemplate()}
              >
                <FileText size={14} />
                Download Template CSV
              </button>
            </div>
          </div>
        </div>

        {/* Import result */}
        {result && (
          <div className="card p-5 animate-in">
            <h3 className="font-semibold text-white mb-3">Import Results</h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{result.total}</p>
                <p className="text-xs text-slate-500">Total rows</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-400">{result.imported}</p>
                <p className="text-xs text-slate-500">Imported</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400">{result.skipped}</p>
                <p className="text-xs text-slate-500">Skipped</p>
              </div>
            </div>

            {result.imported > 0 && (
              <div className="flex items-center gap-2 text-emerald-400 text-sm mb-3">
                <CheckCircle size={16} />
                <span>Successfully imported {result.imported} books</span>
              </div>
            )}

            {result.errors.length > 0 && (
              <div>
                <p className="text-red-400 text-sm font-medium mb-2 flex items-center gap-2">
                  <AlertCircle size={15} />
                  Errors ({result.errors.length})
                </p>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 max-h-48 overflow-y-auto space-y-1">
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-red-300 text-xs">
                      Row {e.row}: {e.message}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Format guide */}
        <div className="card p-5 mt-6">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <BookOpen size={16} className="text-slate-400" />
            CSV Format Reference
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700">
                  {['Column', 'Required', 'Example'].map((h) => (
                    <th key={h} className="text-left py-2 px-3 text-slate-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['title', 'Yes', 'Introduction to Algorithms'],
                  ['authors', 'Yes', 'Author 1, Author 2'],
                  ['isbn', 'Yes', '978-0-262-04630-5'],
                  ['category', 'Yes', 'Computer Science'],
                  ['edition', 'No', '4th Edition'],
                  ['publisher', 'No', 'MIT Press'],
                  ['publishYear', 'No', '2022'],
                  ['description', 'No', 'A great book...'],
                  ['keywords', 'No', 'algorithms, sorting'],
                ].map(([col, req, ex]) => (
                  <tr key={col} className="border-b border-slate-700/30">
                    <td className="py-2 px-3 font-mono text-primary-400">{col}</td>
                    <td className="py-2 px-3">
                      <span className={req === 'Yes' ? 'text-red-400' : 'text-slate-500'}>{req}</span>
                    </td>
                    <td className="py-2 px-3 text-slate-400">{ex}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
