import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import NavBar from './components/NavBar';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Catalog from './pages/Catalog';
import PolicyDetail from './pages/PolicyDetail';

// Layout for authenticated pages: nav bar on top, page content below.
function AuthedLayout() {
  return (
    <ProtectedRoute>
      <NavBar />
      <main className="app-main">
        <Outlet />
      </main>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Protected routes share the authenticated layout */}
      <Route element={<AuthedLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/policies/:id" element={<PolicyDetail />} />
      </Route>

      {/* Defaults */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
