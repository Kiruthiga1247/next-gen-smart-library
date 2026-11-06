/**
 * Search Service
 *
 * Implements multi-field, case-insensitive, typo-tolerant search
 * entirely on the client side for small-to-medium catalogue sizes.
 *
 * This is heuristic search — NOT an LLM or trained ML model.
 * For large catalogues, replace with Algolia / Typesense.
 */

import type { Book, SearchFilters } from '../types';

// ─── Levenshtein distance (typo tolerance) ─────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// ─── Scoring ───────────────────────────────────────────────────

interface ScoredBook {
  book: Book;
  score: number;
}

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

function tokenize(s: string): string[] {
  return normalize(s).split(/\s+/).filter(Boolean);
}

function scoreToken(token: string, target: string): number {
  if (target.includes(token)) return 10;
  if (target.startsWith(token)) return 8;
  const words = target.split(/\s+/);
  for (const word of words) {
    if (word === token) return 12;
    if (word.startsWith(token)) return 9;
    if (token.length >= 4 && levenshtein(token, word) <= 1) return 6;
    if (token.length >= 6 && levenshtein(token, word) <= 2) return 4;
  }
  return 0;
}

function scoreBook(book: Book, queryTokens: string[]): number {
  if (queryTokens.length === 0) return 1;

  let total = 0;
  for (const token of queryTokens) {
    // Title — highest weight
    total += scoreToken(token, normalize(book.title)) * 4;
    // Authors
    for (const author of book.authors) {
      total += scoreToken(token, normalize(author)) * 3;
    }
    // ISBN exact match
    if (book.isbn.replace(/-/g, '').includes(token.replace(/-/g, ''))) {
      total += 15;
    }
    // Category
    total += scoreToken(token, normalize(book.category)) * 2;
    // Keywords
    for (const kw of book.keywords) {
      total += scoreToken(token, normalize(kw)) * 2;
    }
    // Description
    if (book.description) {
      total += scoreToken(token, normalize(book.description)) * 1;
    }
    // Edition / Publisher
    if (book.edition) total += scoreToken(token, normalize(book.edition)) * 1;
  }

  return total;
}

// ─── Public API ────────────────────────────────────────────────

export const searchService = {
  /**
   * Search and filter books client-side.
   * Returns results sorted by relevance score (descending).
   */
  search(books: Book[], filters: SearchFilters): Book[] {
    const rawQuery = (filters.query ?? '').trim();
    const queryTokens = tokenize(rawQuery);

    let results: ScoredBook[] = books
      .filter((b) => !b.isArchived)
      .map((book) => ({ book, score: scoreBook(book, queryTokens) }))
      .filter(({ score }) => queryTokens.length === 0 || score > 0);

    // Category filter
    if (filters.category && filters.category !== 'all') {
      results = results.filter(
        ({ book }) => book.category === filters.category
      );
    }

    // Availability filter
    if (filters.availability === 'available') {
      results = results.filter(({ book }) => book.availableCopies > 0);
    } else if (filters.availability === 'unavailable') {
      results = results.filter(({ book }) => book.availableCopies === 0);
    }

    // Sort
    const sortBy = filters.sortBy ?? 'relevance';
    if (sortBy === 'title') {
      results.sort((a, b) => a.book.title.localeCompare(b.book.title));
    } else if (sortBy === 'rating') {
      results.sort((a, b) => b.book.averageRating - a.book.averageRating);
    } else if (sortBy === 'newest') {
      results.sort((a, b) => {
        const ta = a.book.createdAt?.seconds ?? 0;
        const tb = b.book.createdAt?.seconds ?? 0;
        return tb - ta;
      });
    } else {
      // relevance
      results.sort((a, b) => b.score - a.score);
    }

    return results.map(({ book }) => book);
  },

  /**
   * Get related books by category, author overlap, and keyword similarity.
   * Does NOT require ML — purely heuristic.
   */
  getRelated(book: Book, allBooks: Book[], maxResults = 5): Book[] {
    const candidates = allBooks.filter((b) => b.id !== book.id && !b.isArchived);

    interface Scored { book: Book; score: number }
    const scored: Scored[] = candidates.map((candidate) => {
      let score = 0;

      // Same category
      if (candidate.category === book.category) score += 10;

      // Author overlap
      const sharedAuthors = book.authors.filter((a) =>
        candidate.authors.some((ca) => ca.toLowerCase() === a.toLowerCase())
      );
      score += sharedAuthors.length * 8;

      // Keyword overlap
      const sharedKeywords = book.keywords.filter((k) =>
        candidate.keywords.includes(k)
      );
      score += sharedKeywords.length * 3;

      // Same publisher
      if (book.publisher && candidate.publisher === book.publisher) score += 2;

      return { book: candidate, score };
    });

    return scored
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(({ book }) => book);
  },

  /**
   * Get popular books based on available aggregates.
   * Ordered by rating × log(reviewCount + 1) to balance quality and quantity.
   */
  getPopular(books: Book[], maxResults = 6): Book[] {
    return books
      .filter((b) => !b.isArchived)
      .map((b) => ({
        book: b,
        score: b.averageRating * Math.log1p(b.reviewCount + 1),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(({ book }) => book);
  },
};
