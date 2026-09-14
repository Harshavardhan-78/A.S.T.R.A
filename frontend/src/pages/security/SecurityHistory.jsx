import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import { History, Search, Filter } from 'lucide-react';

export default function SecurityHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [eventFilter, setEventFilter] = useState('ALL');

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/security/history');
      setHistory(res.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch gate log history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  if (loading) return <LoadingSpinner label="Loading Gate Audit History..." />;

  const filteredHistory = history.filter(item => {
    const matchesEvent = eventFilter === 'ALL' || item.event_type === eventFilter;
    const matchesSearch = !searchTerm || (
      item.gate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(item.vehicle_id).includes(searchTerm) ||
      String(item.access_pass_id).includes(searchTerm)
    );
    return matchesEvent && matchesSearch;
  });

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f8fafc' }}>Gate Access Audit History</h1>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
          Complete historical record of all gate entry and exit events processed by security guards.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Search by vehicle ID, pass ID, gate..."
              style={{ paddingLeft: '38px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} color="#94a3b8" />
            <select
              className="input-field"
              style={{ width: '160px' }}
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
            >
              <option value="ALL">All Events</option>
              <option value="ENTRY">ENTRY Only</option>
              <option value="EXIT">EXIT Only</option>
            </select>
          </div>
        </div>
      </div>

      {filteredHistory.length === 0 ? (
        <EmptyState
          title="No Audit Records Found"
          description="No gate entry/exit logs match your filter criteria."
          icon={History}
        />
      ) : (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Log ID</th>
                  <th>Event Type</th>
                  <th>Vehicle ID</th>
                  <th>Access Pass ID</th>
                  <th>Timestamp</th>
                  <th>Gate Terminal</th>
                  <th>Security Guard ID</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: '600', color: '#94a3b8' }}>#{item.id}</td>
                    <td>
                      <StatusBadge status={item.event_type} />
                    </td>
                    <td style={{ fontFamily: 'monospace', color: '#38bdf8', fontWeight: '600' }}>
                      Vehicle #{item.vehicle_id}
                    </td>
                    <td>{item.access_pass_id ? `#${item.access_pass_id}` : '—'}</td>
                    <td>{new Date(item.timestamp).toLocaleString()}</td>
                    <td>{item.gate || 'MAIN_GATE'}</td>
                    <td>User #{item.security_user_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
