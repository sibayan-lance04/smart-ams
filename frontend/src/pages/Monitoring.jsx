import { useEffect, useState } from 'react';
import api from '../api';

const fmtCur = n => n ? `₱${parseFloat(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '₱0.00';
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' }) : '';

export default function Monitoring() {
  const [data, setData] = useState(null);

  useEffect(() => { api.get('/monitoring').then(r => setData(r.data)).catch(console.error); }, []);

  if (!data) return <div className="empty-state"><i className="fas fa-spinner fa-spin" /><p>Loading...</p></div>;

  const { summary, maintenance_due_30, warranty_expiring_30, depreciated_assets, replacement_candidates } = data;

  const summaryCards = [
    { label: 'Maintenance Due (30d)', val: summary.maintenance_due_30, color: '#ffc107', icon: 'fa-tools' },
    { label: 'Warranty Expiring (30d)', val: summary.warranty_expiring_30, color: '#17a2b8', icon: 'fa-shield-alt' },
    { label: 'Highly Depreciated (80%+)', val: summary.highly_depreciated, color: '#dc3545', icon: 'fa-chart-line' },
    { label: 'Replacement Ready (90%+)', val: summary.replacement_candidates, color: '#343a40', icon: 'fa-recycle' },
  ];

  const Section = ({ title, color, icon, rows, cols }) => (
    <div className="card">
      <div className="card-header" style={{ background: color }}>
        <h5><i className={`fas ${icon}`} style={{ marginRight: 8 }} />{title}</h5>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        {rows.length === 0
          ? <div style={{ padding: 20, color: '#888' }}>No records found.</div>
          : <div className="table-wrapper"><table>
            <thead><tr>{cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>
              {rows.map((r, i) => <tr key={i}>{cols.map((c, j) => <td key={j}>{r[j]}</td>)}</tr>)}
            </tbody>
          </table></div>}
      </div>
    </div>
  );

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title"><i className="fas fa-chart-line" style={{ marginRight: 10 }} />Asset Monitoring</h1>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        {summaryCards.map(s => (
          <div key={s.label} className="stat-card" style={{ borderLeftColor: s.color }}>
            <div className="stat-icon" style={{ color: s.color }}><i className={`fas ${s.icon}`} /></div>
            <div className="stat-num" style={{ color: s.color }}>{s.val}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="card">
          <div className="card-header" style={{ background: '#e6a817', color: '#000' }}>
            <h5><i className="fas fa-tools" style={{ marginRight: 8 }} />Assets Nearing Maintenance</h5>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {maintenance_due_30.length === 0
              ? <div style={{ padding: 20, color: '#888' }}>No maintenance due in 30 days.</div>
              : <div className="table-wrapper"><table>
                <thead><tr><th>Asset</th><th>Due Date</th><th>Days</th><th>Department</th></tr></thead>
                <tbody>
                  {maintenance_due_30.map((a, i) => (
                    <tr key={i} style={{ background: a.days_until_due <= 7 ? '#fff3cd' : '' }}>
                      <td><strong>{a.asset_name}</strong><br /><small className="text-muted">{a.control_number}</small></td>
                      <td>{fmtDate(a.next_due_date)}</td>
                      <td><span className={`badge ${a.days_until_due <= 7 ? 'badge-danger' : a.days_until_due <= 14 ? 'badge-warning' : 'badge-info'}`}>{a.days_until_due}d</span></td>
                      <td>{a.department_name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>}
          </div>
        </div>

        <div className="card">
          <div className="card-header" style={{ background: '#17a2b8' }}>
            <h5><i className="fas fa-shield-alt" style={{ marginRight: 8 }} />Warranty Expiring Soon</h5>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {warranty_expiring_30.length === 0
              ? <div style={{ padding: 20, color: '#888' }}>No warranties expiring in 30 days.</div>
              : <div className="table-wrapper"><table>
                <thead><tr><th>Asset</th><th>Expires</th><th>Days</th><th>Provider</th></tr></thead>
                <tbody>
                  {warranty_expiring_30.map((a, i) => (
                    <tr key={i}>
                      <td><strong>{a.asset_name}</strong><br /><small className="text-muted">{a.control_number}</small></td>
                      <td>{fmtDate(a.insurance_end)}</td>
                      <td><span className={`badge ${a.days_until_expires <= 7 ? 'badge-danger' : 'badge-warning'}`}>{a.days_until_expires}d</span></td>
                      <td>{a.insurance_provider || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-header" style={{ background: '#dc3545' }}>
            <h5><i className="fas fa-chart-line" style={{ marginRight: 8 }} />Highly Depreciated (80–89%)</h5>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {depreciated_assets.length === 0
              ? <div style={{ padding: 20, color: '#888' }}>None found.</div>
              : <div className="table-wrapper"><table>
                <thead><tr><th>Asset</th><th>Original</th><th>Current</th><th>Depr%</th></tr></thead>
                <tbody>
                  {depreciated_assets.map((a, i) => (
                    <tr key={i}>
                      <td><strong>{a.asset_name}</strong><br /><small className="text-muted">{a.control_number}</small></td>
                      <td>{fmtCur(a.cost)}</td>
                      <td>{fmtCur(a.current_value)}</td>
                      <td><span className="badge badge-danger">{a.depreciation_percentage}%</span></td>
                    </tr>
                  ))}
                </tbody>
              </table></div>}
          </div>
        </div>

        <div className="card">
          <div className="card-header" style={{ background: '#343a40' }}>
            <h5><i className="fas fa-recycle" style={{ marginRight: 8 }} />Replacement Candidates (90%+)</h5>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {replacement_candidates.length === 0
              ? <div style={{ padding: 20, color: '#888' }}>None found.</div>
              : <div className="table-wrapper"><table>
                <thead><tr><th>Asset</th><th>Original</th><th>Current</th><th>Depr%</th></tr></thead>
                <tbody>
                  {replacement_candidates.map((a, i) => (
                    <tr key={i}>
                      <td><strong>{a.asset_name}</strong><br /><small className="text-muted">{a.control_number}</small></td>
                      <td>{fmtCur(a.cost)}</td>
                      <td>{fmtCur(a.current_value)}</td>
                      <td><span className="badge badge-dark">{a.depreciation_percentage}%</span></td>
                    </tr>
                  ))}
                </tbody>
              </table></div>}
          </div>
        </div>
      </div>
    </div>
  );
}
