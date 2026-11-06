import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { RootLayout } from './components/layout/Layout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

// Public pages
import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { BookDetailPage } from './pages/BookDetailPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Student pages
import { DashboardPage } from './pages/DashboardPage';

// Admin pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminBooksPage } from './pages/admin/AdminBooksPage';
import { AdminCopiesPage } from './pages/admin/AdminCopiesPage';
import { AdminLoansPage } from './pages/admin/AdminLoansPage';
import { AdminReservationsPage } from './pages/admin/AdminReservationsPage';
import { AdminImportPage } from './pages/admin/AdminImportPage';
import { AdminAuditPage } from './pages/admin/AdminAuditPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<RootLayout />}>
            {/* Public */}
            <Route index element={<HomePage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="books/:id" element={<BookDetailPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />

            {/* Protected student */}
            <Route
              path="dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />

            {/* Protected admin */}
            <Route
              path="admin"
              element={
                <ProtectedRoute requireLibrarian>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/books"
              element={
                <ProtectedRoute requireLibrarian>
                  <AdminBooksPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/copies"
              element={
                <ProtectedRoute requireLibrarian>
                  <AdminCopiesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/loans"
              element={
                <ProtectedRoute requireLibrarian>
                  <AdminLoansPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/reservations"
              element={
                <ProtectedRoute requireLibrarian>
                  <AdminReservationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/import"
              element={
                <ProtectedRoute requireLibrarian>
                  <AdminImportPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/audit"
              element={
                <ProtectedRoute requireLibrarian>
                  <AdminAuditPage />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="404" element={<NotFoundPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
