import { useEffect, useState, useMemo } from 'react';
import api from '../api';

const actionColor = a => ({ CREATE: 'badge-success', UPDATE: 'badge-warning', DELETE: 'badge-danger', LOGIN: 'badge-info', LOGOUT: 'badge-secondary', MONITOR: 'badge-info' }[a] || 'badge-secondary');
const tableIcon = t => ({ assets: 'fa-boxes', users: 'fa-users', departments: 'fa-building', maintenance: 'fa-tools', system: 'fa-cogs' }[t] || 'fa-table');
const fmtDate = d => d ? new Date(d).toLocaleString('en-PH') : '';

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterTable, setFilterTable] = useState('');

  useEffect(() => { api.get('/activity-log').then(r => setLogs(r.data.data)).catch(console.error); }, []);

  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (filterAction && l.action_type !== filterAction) return false;
      if (filterTable && l.table_name !== filterTable) return false;
      if (search) {
        const q = search.toLowerCase();
        return l.full_name?.toLowerCase().includes(q) || l.username?.toLowerCase().includes(q) || l.description?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [logs, search, filterAction, filterTable]);

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title"><i className="fas fa-history" style={{ marginRight: 10 }} />Activity Log</h1>
      </div>

      <div className="card">
        <div className="card-header">
          <h5>System Activity Log ({filtered.length})</h5>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="form-control" placeholder="Search user/description..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 220 }} />
            <select className="form-control" value={filterAction} onChange={e => setFilterAction(e.target.value)} style={{ width: 140 }}>
              <option value="">All Actions</option>
              {['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'MONITOR'].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select className="form-control" value={filterTable} onChange={e => setFilterTable(e.target.value)} style={{ width: 140 }}>
              <option value="">All Tables</option>
              {['assets', 'users', 'departments', 'maintenance', 'system'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Table</th><th>Description</th></tr></thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={5} className="empty-state">No logs found.</td></tr>}
                {filtered.map(l => (
                  <tr key={l.log_id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{fmtDate(l.timestamp)}</td>
                    <td>
                      {l.user_id === 0
                        ? <span className="badge badge-warning"><i className="fas fa-cog" style={{ marginRight: 4 }} />System</span>
                        : l.full_name === 'Deleted User'
                          ? <span className="badge badge-danger"><i className="fas fa-user-times" style={{ marginRight: 4 }} />Deleted User</span>
                          : <><strong>{l.full_name}</strong><br /><small className="text-muted">@{l.username}</small></>
                      }
                    </td>
                    <td><span className={`badge ${actionColor(l.action_type)}`}>{l.action_type}</span></td>
                    <td><i className={`fas ${tableIcon(l.table_name)}`} style={{ marginRight: 6 }} />{l.table_name}</td>
                    <td style={{ maxWidth: 300, fontSize: '0.88rem' }}>{l.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
