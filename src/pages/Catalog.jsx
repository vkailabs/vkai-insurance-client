import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCatalog, enrollInPolicy } from '../api/client';
import PolicyCard from '../components/PolicyCard';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';

export default function Catalog() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [enrollingId, setEnrollingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getCatalog();
      setItems(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load the catalog.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleEnroll(catalogId) {
    setEnrollingId(catalogId);
    setError('');
    try {
      await enrollInPolicy(catalogId);
      // Redirect to the dashboard, flagging a success message to show there.
      navigate('/dashboard', { state: { flash: 'You have enrolled in a new policy.' } });
    } catch (err) {
      setError(err.message || 'Failed to enroll in policy.');
      setEnrollingId(null);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Policy catalog</h1>
      </header>

      {loading && <Spinner label="Loading catalog…" />}
      {!loading && <ErrorMessage message={error} onRetry={load} />}

      {!loading && !error && items.length === 0 && (
        <div className="empty-state">
          <h2>No policies available</h2>
          <p>There are no policies in the catalog right now. Please check back later.</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="card-grid">
          {items.map((item) => (
            <PolicyCard
              key={item.id}
              variant="catalog"
              item={item}
              onEnroll={handleEnroll}
              enrolling={enrollingId === item.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
