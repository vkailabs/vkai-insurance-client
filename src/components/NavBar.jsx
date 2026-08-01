// Top nav bar shown on all authenticated pages. Displays the logged-in user's
// name/email top-right (per naming doc convention) with a Logout button.
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const displayName = user?.displayName || user?.email || 'Account';

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-left">
          <Link to="/dashboard" className="navbar-brand">
            VK AI Labs Insurance
          </Link>
          <div className="navbar-links">
            <Link to="/dashboard" className="navbar-link">
              Dashboard
            </Link>
            <Link to="/catalog" className="navbar-link">
              Catalog
            </Link>
          </div>
        </div>
        <div className="navbar-right">
          <span className="navbar-user" title={user?.email || ''}>
            {displayName}
          </span>
          <button type="button" className="btn btn-secondary btn-small" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
