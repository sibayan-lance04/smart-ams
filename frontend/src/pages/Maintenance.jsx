import { useEffect, useState, useMemo } from 'react';
import api from '../api';

const empty = { asset_id: '', maintenance_date: '', next_due_date: '', details: '', status: 'Pending', cost: '0' };
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' }) : '';
const fmtCur = n => n ? `₱${parseFloat(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '₱0.00';

export default function Maintenance() {
  const [records, setRecords] = useState([]);
  const [assets, setAssets] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [alert, setAlert] = useState(null);
  const [search, setSearch] = useState('');

  const load = () => {
    api.get('/maintenance').then(r => setRecords(r.data.data));
    api.get('/assets').then(r => setAssets(r.data.data.filter(a => ['Active', 'Under Maintenance'].includes(a.status))));
  };
  useEffect(() => { load(); }, []);

  const showAlert = (msg, type = 'success') => { setAlert({ msg, type }); setTimeout(() => setAlert(null), 4000); };

  const today = new Date().toISOString().split('T')[0];
  const sixMonths = (() => { const d = new Date(); d.setMonth(d.getMonth() + 6); return d.toISOString().split('T')[0]; })();

  const openCreate = () => { setForm({ ...empty, maintenance_date: today, next_due_date: sixMonths }); setEditId(null); setModal(true); };
  const openEdit = r => {
    setForm({ asset_id: r.asset_id, maintenance_date: r.maintenance_date?.split('T')[0] || '', next_due_date: r.next_due_date?.split('T')[0] || '', details: r.details, status: r.status, cost: r.cost });
    setEditId(r.maintenance_id); setModal(true);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      if (editId) await api.put(`/maintenance/${editId}`, form);
      else await api.post('/maintenance', form);
      setModal(null); load(); showAlert(editId ? 'Updated.' : 'Maintenance scheduled.');
    } catch (err) { showAlert(err.response?.data?.message || 'Error.', 'danger'); }
  };

  const handleDelete = async r => {
    if (!confirm(`Delete maintenance for "${r.asset_name}"?`)) return;
    try { await api.delete(`/maintenance/${r.maintenance_id}`); load(); showAlert('Deleted.'); }
    catch (err) { showAlert(err.response?.data?.message || 'Error.', 'danger'); }
  };

  const filtered = useMemo(() => {
    if (!search) return records;
    const q = search.toLowerCase();
    return records.filter(r => r.asset_name?.toLowerCase().includes(q) || r.control_number?.toLowerCase().includes(q) || r.status?.toLowerCase().includes(q));
  }, [records, search]);

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title"><i className="fas fa-tools" style={{ marginRight: 10 }} />Maintenance</h1>
        <button className="btn btn-primary" onClick={openCreate}><i className="fas fa-plus" />Schedule Maintenance</button>
      </div>
      {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}
      <div className="card">
        <div className="card-header">
          <h5>Maintenance Records ({filtered.length})</h5>
          <input className="form-control" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 240 }} />
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Asset</th><th>Control #</th><th>Assigned To</th><th>Maint. Date</th><th>Next Due</th><th>Days Until Due</th><th>Status</th><th>Cost</th><th>Details</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.maintenance_id} style={{ background: r.days_until_due <= 7 && r.status === 'Pending' ? '#fff8e1' : '' }}>
                    <td><strong>{r.asset_name}</strong></td>
                    <td>{r.control_number}</td>
                    <td>{r.assigned_to_name || '—'}</td>
                    <td>{fmtDate(r.maintenance_date)}</td>
                    <td>{fmtDate(r.next_due_date)}</td>
                    <td>
                      {r.status === 'Pending'
                        ? <span className={`badge ${r.days_until_due <= 0 ? 'badge-danger' : r.days_until_due <= 7 ? 'badge-warning' : 'badge-info'}`}>
                          {r.days_until_due > 0 ? `${r.days_until_due} days` : 'Overdue'}
                        </span>
                        : <span className="badge badge-success">Done</span>}
                    </td>
                    <td><span className={`badge ${r.status === 'Completed' ? 'badge-success' : 'badge-warning'}`}>{r.status}</span></td>
                    <td>{fmtCur(r.cost)}</td>
                    <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.details}</td>
                    <td>
                      <div className="actions-cell">
                        <button className="btn btn-sm btn-outline btn-icon" onClick={() => openEdit(r)}><i className="fas fa-edit" /></button>
                        <button className="btn btn-sm btn-danger btn-icon" onClick={() => handleDelete(r)}><i className="fas fa-trash" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h5>{editId ? 'Edit' : 'Schedule'} Maintenance</h5>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row form-row-2">
                  <div className="form-group">
                    <label className="form-label">Asset <span style={{ color: 'red' }}>*</span></label>
                    <select className="form-control" value={form.asset_id} onChange={e => setForm(p => ({ ...p, asset_id: e.target.value }))} required>
                      <option value="">Select Asset</option>
                      {assets.map(a => <option key={a.asset_id} value={a.asset_id}>{a.asset_name} ({a.control_number})</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-control" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                      <option value="Pending">Pending</option><option value="Completed">Completed</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Maintenance Date <span style={{ color: 'red' }}>*</span></label>
                    <input type="date" className="form-control" value={form.maintenance_date} onChange={e => setForm(p => ({ ...p, maintenance_date: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Next Due Date <span style={{ color: 'red' }}>*</span></label>
                    <input type="date" className="form-control" value={form.next_due_date} onChange={e => setForm(p => ({ ...p, next_due_date: e.target.value }))} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Cost (₱)</label>
                  <input type="number" className="form-control" min="0" step="0.01" value={form.cost} onChange={e => setForm(p => ({ ...p, cost: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Details <span style={{ color: 'red' }}>*</span></label>
                  <textarea className="form-control" rows={3} value={form.details} onChange={e => setForm(p => ({ ...p, details: e.target.value }))} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><i className="fas fa-save" />Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
