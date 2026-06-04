import { useEffect, useState } from 'react';
import api from '../api';

const fmtCur = n => n ? `₱${parseFloat(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '₱0.00';
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' }) : '';

const REPORT_TYPES = [
  { key: 'all_assets', label: 'All Assets', icon: 'fa-boxes', color: '#667eea' },
  { key: 'maintenance_due', label: 'Maintenance Due', icon: 'fa-tools', color: '#ffc107' },
  { key: 'depreciated_assets', label: 'Depreciated Assets', icon: 'fa-exclamation-triangle', color: '#dc3545' },
  { key: 'department_summary', label: 'Department Summary', icon: 'fa-building', color: '#17a2b8' },
  { key: 'maintenance_costs', label: 'Maintenance Costs', icon: 'fa-chart-line', color: '#6c757d' },
  { key: 'warranty_status', label: 'Warranty Status', icon: 'fa-shield-alt', color: '#28a745' },
];

const COLS = {
  all_assets: ['Asset Name', 'Control #', 'Purchase Date', 'Cost', 'Current Value', 'Status', 'Assigned To', 'Department', 'Warranty'],
  maintenance_due: ['Asset', 'Control #', 'Assigned To', 'Department', 'Next Due', 'Days Until Due', 'Status', 'Details'],
  depreciated_assets: ['Asset', 'Control #', 'Purchase Date', 'Cost', 'Current Value', 'Department', 'Status', 'Depr%', 'Days Owned'],
  department_summary: ['Department', 'Manager', 'Total Assets', 'Active', 'Depreciated', 'Total Value', 'Avg Value'],
  maintenance_costs: ['Asset', 'Control #', 'Department', 'Count', 'Total Cost', 'Avg Cost', 'Last Maintenance'],
  warranty_status: ['Asset', 'Control #', 'Department', 'Assigned To', 'Warranty Status', 'Expires', 'Days', 'Provider'],
};

function getRowCells(type, row) {
  if (type === 'all_assets') return [
    row.asset_name, row.control_number, fmtDate(row.purchase_date), fmtCur(row.cost),
    fmtCur(row.current_value || row.cost), row.status, row.assigned_to_name || 'Unassigned',
    row.department_name || '—', row.warranty_status,
  ];
  if (type === 'maintenance_due') return [
    row.asset_name, row.control_number, row.assigned_to_name || '—', row.department_name || '—',
    fmtDate(row.next_due_date),
    row.days_until_due > 0 ? `${row.days_until_due} days` : 'Overdue',
    row.status, row.details,
  ];
  if (type === 'depreciated_assets') return [
    row.asset_name, row.control_number, fmtDate(row.purchase_date), fmtCur(row.cost),
    fmtCur(row.current_value), row.department_name || '—', row.status,
    `${row.depreciation_percentage}%`, `${row.days_owned} days`,
  ];
  if (type === 'department_summary') return [
    row.department_name, row.manager || '—', row.total_assets, row.active_assets, row.depreciated_assets,
    fmtCur(row.total_value), fmtCur(row.avg_asset_value),
  ];
  if (type === 'maintenance_costs') return [
    row.asset_name, row.control_number, row.department_name || '—', row.maintenance_count,
    fmtCur(row.total_maintenance_cost), fmtCur(row.avg_maintenance_cost), fmtDate(row.last_maintenance_date),
  ];
  if (type === 'warranty_status') return [
    row.asset_name, row.control_number, row.department_name || '—', row.assigned_to_name || '—',
    row.warranty_status, fmtDate(row.insurance_end),
    row.days_until_expires !== null ? `${row.days_until_expires}d` : '—',
    row.insurance_provider || '—',
  ];
  return [];
}

function exportCSV(title, cols, rows, type) {
  const lines = [cols.join(',')];
  rows.forEach(r => {
    lines.push(getRowCells(type, r).map(c => `"${String(c).replace(/"/g, '""')}"`).join(','));
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `${title.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

export default function Reports() {
  const [activeType, setActiveType] = useState(null);
  const [reportData, setReportData] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const loadReport = async type => {
    setActiveType(type); setSearch(''); setLoading(true);
    try {
      const r = await api.get(`/reports/${type}`);
      setReportData(r.data.data); setTitle(r.data.title);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const filtered = search
    ? reportData.filter(row => JSON.stringify(row).toLowerCase().includes(search.toLowerCase()))
    : reportData;

  const cols = activeType ? COLS[activeType] : [];

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title"><i className="fas fa-chart-bar" style={{ marginRight: 10 }} />Reports</h1>
      </div>

      <div className="card">
        <div className="card-header"><h5>Select Report</h5></div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {REPORT_TYPES.map(rt => (
              <button key={rt.key}
                onClick={() => loadReport(rt.key)}
                style={{
                  padding: '16px', borderRadius: 10, border: `2px solid ${activeType === rt.key ? rt.color : '#ddd'}`,
                  background: activeType === rt.key ? rt.color : 'white',
                  color: activeType === rt.key ? 'white' : '#333',
                  cursor: 'pointer', transition: 'all 0.2s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                }}>
                <i className={`fas ${rt.icon}`} style={{ fontSize: '1.5rem' }} />
                <strong style={{ fontSize: '0.9rem' }}>{rt.label}</strong>
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeType && (
        <div className="card">
          <div className="card-header">
            <h5><i className="fas fa-file-alt" style={{ marginRight: 8 }} />{title}</h5>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input className="form-control" placeholder="Search results..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 220 }} />
              <button className="btn btn-success btn-sm" onClick={() => exportCSV(title, cols, filtered, activeType)}>
                <i className="fas fa-file-csv" /> CSV
              </button>
              <button className="btn btn-info btn-sm" onClick={() => window.print()}>
                <i className="fas fa-print" /> Print
              </button>
            </div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {loading ? <div className="empty-state"><i className="fas fa-spinner fa-spin" /></div>
              : filtered.length === 0 ? <div className="empty-state"><i className="fas fa-search" /><p>No data found.</p></div>
              : <div className="table-wrapper"><table>
                <thead><tr>{cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
                <tbody>
                  {filtered.map((row, i) => (
                    <tr key={i}>{getRowCells(activeType, row).map((cell, j) => <td key={j}>{cell}</td>)}</tr>
                  ))}
                </tbody>
              </table></div>}
          </div>
        </div>
      )}
    </div>
  );
}
