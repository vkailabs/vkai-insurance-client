// Guards authenticated routes: redirects to /login when there is no user.
// Waits for Firebase to restore the session before deciding.
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  // Wait for Firebase's first auth-state resolution before making any routing
  // decision — never redirect while the auth state is still unknown.
  if (loading) {
    return (
      <div className="page-center">
        <Spinner label="Restoring session…" />
      </div>
    );
  }

  // Only redirect once we know for certain there is no authenticated user.
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
