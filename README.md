# Next-Gen Smart Library System

A complete, production-ready college library web application built with React, TypeScript, Vite, Tailwind CSS, and Firebase.

## 🚀 Features

### Student Features
- **Smart Book Search** — multi-field search (title, author, ISBN, category, keywords) with typo tolerance
- **Exact Physical Locations** — rack, row, shelf, and accession number for every copy
- **Multiple Copies** — each physical copy shown individually with its own status and location
- **Book Reservations** — request, track, and cancel reservations
- **Reviews & Ratings** — submit, view, and delete reviews with live rating aggregation
- **Student Dashboard** — active loans, reservation history, borrowing history

### Librarian Features
- **Admin Dashboard** — overview stats (titles, copies, loans, reservations, overdue)
- **Book Management** — full CRUD, archive/restore, search and filter
- **Physical Copy Management** — per-copy CRUD with location fields, accession number duplicate detection
- **Issue / Return** — atomic transactions prevent double-issue; overdue tracking
- **Reservation Management** — approve, cancel, mark fulfilled
- **CSV Import / Export** — bulk import with validation, progress tracking, error reporting
- **Audit Log** — immutable record of all inventory and loan changes

### Security
- Firebase Authentication (email/password)
- Firestore Security Rules enforce ownership and role permissions
- Role stored in Firestore `users` collection — users cannot self-assign admin role
- Admin role set manually via Firebase Console (see Admin Setup below)

---

## 📋 Prerequisites

- Node.js 18+
- npm 9+
- A Firebase project (Blaze plan recommended for production)

---

## 🛠 Local Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd nextgen-library
npm install
```

### 2. Create Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable **Authentication** → Email/Password provider
4. Enable **Firestore Database** → Start in **production mode**
5. Go to Project Settings → Your apps → Add web app → Copy config

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your Firebase values:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 4. Deploy Firestore rules and indexes

```bash
npm install -g firebase-tools
firebase login
firebase init  # choose Firestore, Hosting; select your project
firebase deploy --only firestore:rules,firestore:indexes
```

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 👨‍💼 Admin Provisioning

> **IMPORTANT**: Admin and librarian roles are set manually — users cannot elevate themselves.

### Method: Firebase Console

1. Register a normal account through the app
2. Go to **Firebase Console → Firestore → users collection**
3. Open the document for that user's UID
4. Change the `role` field from `"student"` to `"librarian"` (or `"admin"`)
5. Sign out and back in — admin nav will appear

The Firestore security rules prevent any user from changing their own role.

---

## 🧪 Testing

```bash
# Run all tests once
npm test

# Watch mode
npm run test:watch

# Interactive UI
npm run test:ui
```

Tests cover:
- Search by title, author, ISBN, keyword
- Case-insensitive search, empty input, whitespace
- Typo tolerance (Levenshtein)
- Category and availability filters
- Sort by title, rating
- Archive exclusion
- Multiple copies / availability flags
- Zod validation schemas (book, copy, review, auth, CSV)
- Related books and popular books heuristics

---

## 🚀 Deployment

### Firebase Hosting

```bash
npm run build
firebase deploy --only hosting
```

Or deploy everything at once:

```bash
firebase deploy
```

Your app is live at `https://<project-id>.web.app`

---

## 🏗 Architecture

```
src/
  components/
    ui/         # BookCard, AvailabilityBadge, LocationCard, SearchBar,
                #   Modal, Skeleton, Pagination, FormField
    layout/     # Navbar, AdminSidebar, Layout, ProtectedRoute
  contexts/
    AuthContext.tsx      # Firebase user + Firestore role
  services/
    authService.ts       # register, login, logout
    bookService.ts       # book CRUD, aggregates
    copyService.ts       # physical copy CRUD
    loanService.ts       # issue/return (Firestore transactions)
    reservationService.ts# reservations with duplicate guard
    reviewService.ts     # reviews + rating rollup (transactions)
    searchService.ts     # client-side search + typo tolerance
    csvService.ts        # PapaParse import/export
    statsService.ts      # dashboard aggregates
    auditService.ts      # best-effort audit logging
  pages/
    HomePage.tsx         # Landing page with hero search
    SearchPage.tsx       # Search results with filters
    BookDetailPage.tsx   # Detail + copy locations + reviews
    LoginPage.tsx
    RegisterPage.tsx
    DashboardPage.tsx    # Student dashboard
    admin/
      AdminDashboardPage.tsx
      AdminBooksPage.tsx
      AdminCopiesPage.tsx
      AdminLoansPage.tsx
      AdminReservationsPage.tsx
      AdminImportPage.tsx
      AdminAuditPage.tsx
  schemas/index.ts       # Zod validation schemas
  types/index.ts         # TypeScript types for all entities
  data/sampleData.ts     # DEMO data (clearly labelled)
  lib/firebase.ts        # Firebase singleton init
  test/                  # Vitest tests
```

### Firestore Collections

| Collection | Purpose |
|---|---|
| `books` | Book titles with aggregate counts |
| `bookCopies` | Individual physical copies with rack/row/shelf |
| `users` | User profiles with role |
| `reservations` | Student reservation requests |
| `loans` | Active and historical borrow records |
| `reviews` | Per-book student reviews |
| `auditLogs` | Immutable action history |

---

## ⚠️ Limitations & Known Issues

1. **Search is client-side** — fetches all books from Firestore and filters locally. Fine for up to ~5,000 titles. For larger catalogues, integrate Algolia or Typesense.
2. **Firebase Emulator** — Firestore rule tests against the Emulator Suite are not included in this version. Rules can be tested manually via the Firebase Console.
3. **No email notifications** — reservation updates are displayed in the student dashboard but no email is sent. Add Firebase Functions + SendGrid for emails.
4. **No book cover images** — covers use a dynamic color gradient. Add Firebase Storage integration for real images.
5. **Role changes require page reload** — the app re-reads the role from Firestore on each auth change. After a librarian role is manually assigned, the user must sign out and back in.
6. **CSV import is sequential** — large imports (>500 rows) may be slow. Add batch writes for better performance.

---

## 📜 Implemented Features Checklist

- [x] Landing page with hero search
- [x] Multi-field, typo-tolerant search
- [x] Category and availability filters
- [x] Sorting by relevance, title, rating, newest
- [x] Book detail page with physical copy locations
- [x] Multiple-copy display (each with its own rack/row/shelf)
- [x] Related book recommendations
- [x] Student registration and login
- [x] Student dashboard (loans, reservations, history)
- [x] Reservation creation with duplicate prevention
- [x] Reservation cancellation
- [x] Reviews and star ratings with average rollup
- [x] Librarian admin dashboard with stats
- [x] Book CRUD with archive/restore
- [x] Physical copy CRUD with accession number validation
- [x] Issue/return with Firestore atomic transactions
- [x] Reservation management (approve/cancel/fulfill)
- [x] CSV import with validation and error reporting
- [x] CSV export
- [x] Audit log
- [x] Firestore security rules (production-grade)
- [x] Firestore index configuration
- [x] Firebase Hosting configuration
- [x] .env.example (no secrets committed)
- [x] Responsive design (mobile/tablet/desktop)
- [x] Loading skeletons, empty states, error states
- [x] Toast notifications
- [x] Accessible keyboard navigation
- [x] Vitest tests for search and validation schemas
- [x] 404 Not Found page
