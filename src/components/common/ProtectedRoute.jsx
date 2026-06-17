import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children, role }) {
  // const { user } = useAuth();
  const { user, loading } = useAuth();
  if (loading) {
  return <div>Loading...</div>;
}

  // Not logged in → redirect to login
  if (!user) return <Navigate to="/login" replace />;

  // Wrong role → redirect to home
  if (role && user.role !== role) return <Navigate to="/" replace />;

  return children;
}
