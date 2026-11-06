import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Skeleton } from '../ui/Skeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: 'student' | 'librarian' | 'admin';
  requireLibrarian?: boolean;
}

export function ProtectedRoute({ children, requireLibrarian = false }: ProtectedRouteProps) {
  const { firebaseUser, isLibrarian, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="page-container">
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireLibrarian && !isLibrarian) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
