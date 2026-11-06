import Papa from 'papaparse';
import { bookService } from './bookService';
import { csvBookRowSchema } from '../schemas';
import type { Book } from '../types';
import type { CsvImportResult } from '../types';

export const csvService = {
  /**
   * Parse and validate a CSV file of books, then import them.
   * Expected columns: title, authors, isbn, category, edition?,
   *   publisher?, publishYear?, description?, keywords?
   */
  async importBooks(
    file: File,
    onProgress?: (row: number, total: number) => void
  ): Promise<CsvImportResult> {
    return new Promise((resolve) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const rows = results.data as Record<string, string>[];
          const result: CsvImportResult = {
            total: rows.length,
            imported: 0,
            skipped: 0,
            errors: [],
          };

          for (let i = 0; i < rows.length; i++) {
            onProgress?.(i + 1, rows.length);
            const rawRow = rows[i];
            const parseResult = csvBookRowSchema.safeParse(rawRow);

            if (!parseResult.success) {
              const messages = parseResult.error.errors.map((e) => e.message).join('; ');
              result.errors.push({ row: i + 2, message: messages }); // +2 for header + 1-indexed
              result.skipped++;
              continue;
            }

            const row = parseResult.data;

            try {
              await bookService.create({
                title: row.title,
                authors: row.authors,
                isbn: row.isbn,
                category: row.category,
                edition: row.edition,
                publisher: row.publisher,
                publishYear: row.publishYear ? parseInt(row.publishYear, 10) : undefined,
                description: row.description,
                keywords: row.keywords,
              });
              result.imported++;
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err);
              result.errors.push({ row: i + 2, message: msg });
              result.skipped++;
            }
          }

          resolve(result);
        },
        error: (err) => {
          resolve({
            total: 0,
            imported: 0,
            skipped: 0,
            errors: [{ row: 0, message: `CSV parse error: ${err.message}` }],
          });
        },
      });
    });
  },

  /**
   * Export books as a CSV file and trigger browser download.
   */
  exportBooks(books: Book[]): void {
    const rows = books.map((b) => ({
      title: b.title,
      authors: b.authors.join(', '),
      isbn: b.isbn,
      category: b.category,
      edition: b.edition ?? '',
      publisher: b.publisher ?? '',
      publishYear: b.publishYear ?? '',
      description: b.description ?? '',
      keywords: b.keywords.join(', '),
      totalCopies: b.totalCopies,
      availableCopies: b.availableCopies,
      averageRating: b.averageRating,
      reviewCount: b.reviewCount,
    }));

    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `library-catalogue-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Generate a CSV template for bulk import.
   */
  downloadTemplate(): void {
    const template = [
      {
        title: 'Introduction to Algorithms',
        authors: 'Thomas H. Cormen, Charles E. Leiserson',
        isbn: '978-0-262-04630-5',
        category: 'Computer Science',
        edition: '4th Edition',
        publisher: 'MIT Press',
        publishYear: '2022',
        description: 'Comprehensive algorithms textbook',
        keywords: 'algorithms, data structures, complexity',
      },
    ];
    const csv = Papa.unparse(template);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'book-import-template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
