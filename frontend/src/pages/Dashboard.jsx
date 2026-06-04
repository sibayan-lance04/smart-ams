import { useEffect, useState } from 'react';
import api from '../api';

const fmt = n => n?.toLocaleString('en-PH', { minimumFractionDigits: 2 }) ?? '0.00';
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' }) : '';
const actionColor = a => ({ CREATE: 'badge-success', UPDATE: 'badge-warning', DELETE: 'badge-danger', LOGIN: 'badge-info', LOGOUT: 'badge-secondary' }[a] || 'badge-secondary');

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/dashboard').then(r => setData(r.data)).catch(console.error);
  }, []);

  if (!data) return <div className="empty-state"><i className="fas fa-spinner fa-spin" /><p>Loading...</p></div>;

  const { stats, recent_activities, maintenance_due } = data;

  const statCards = [
    { label: 'Total Assets', val: stats.total_assets, icon: 'fa-boxes', color: '#667eea' },
    { label: 'Active Assets', val: stats.active_assets, icon: 'fa-check-circle', color: '#28a745' },
    { label: 'Depreciated', val: stats.depreciated_assets, icon: 'fa-exclamation-triangle', color: '#ffc107' },
    { label: 'Under Warranty', val: stats.under_warranty, icon: 'fa-shield-alt', color: '#17a2b8' },
    { label: 'Maintenance Due', val: stats.maintenance_due, icon: 'fa-tools', color: '#dc3545' },
    { label: 'Total Value', val: `₱${fmt(stats.total_value)}`, icon: 'fa-peso-sign', color: '#28a745', small: true },
  ];

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title"><i className="fas fa-tachometer-alt" style={{ marginRight: 10 }} />Dashboard</h1>
      </div>

      <div className="stats-grid">
        {statCards.map(s => (
          <div key={s.label} className="stat-card" style={{ borderLeftColor: s.color }}>
            <div className="stat-icon" style={{ color: s.color }}><i className={`fas ${s.icon}`} /></div>
            <div className={s.small ? '' : 'stat-num'} style={s.small ? { fontSize: '1.2rem', fontWeight: 700, color: s.color } : {}}>{s.val}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-header"><h5><i className="fas fa-history" style={{ marginRight: 8 }} />Recent Activity</h5></div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Time</th><th>User</th><th>Action</th><th>Table</th><th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {recent_activities.map(a => (
                    <tr key={a.log_id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(a.timestamp)}</td>
                      <td>{a.full_name}<br /><small className="text-muted">@{a.username}</small></td>
                      <td><span className={`badge ${actionColor(a.action_type)}`}>{a.action_type}</span></td>
                      <td>{a.table_name}</td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h5><i className="fas fa-tools" style={{ marginRight: 8 }} />Maintenance Due</h5></div>
          <div className="card-body">
            {maintenance_due.length === 0
              ? <p className="text-muted">No maintenance due in 30 days.</p>
              : maintenance_due.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <div>
                    <strong style={{ fontSize: '0.9rem' }}>{m.asset_name}</strong><br />
                    <small className="text-muted">{m.control_number} · Due {fmtDate(m.next_due_date)}</small>
                  </div>
                  <span className={`badge ${m.days_until_due <= 7 ? 'badge-danger' : 'badge-warning'}`}>
                    {m.days_until_due} days
                  </span>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}
