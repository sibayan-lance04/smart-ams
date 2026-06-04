import { useEffect, useState, useMemo } from 'react';
import api from '../api';

const empty = { department_name: '', description: '', manager: '', manager_email: '', manager_contact: '', status: 'Active' };
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' }) : '';

export default function Departments() {
  const [depts, setDepts] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [alert, setAlert] = useState(null);
  const [search, setSearch] = useState('');

  const load = () => api.get('/departments').then(r => setDepts(r.data.data));
  useEffect(() => { load(); }, []);

  const showAlert = (msg, type = 'success') => { setAlert({ msg, type }); setTimeout(() => setAlert(null), 4000); };

  const openCreate = () => { setForm(empty); setEditId(null); setModal(true); };
  const openEdit = d => {
    setForm({ department_name: d.department_name, description: d.description || '', manager: d.manager || '', manager_email: d.manager_email || '', manager_contact: d.manager_contact || '', status: d.status });
    setEditId(d.department_id); setModal(true);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      if (editId) await api.put(`/departments/${editId}`, form);
      else await api.post('/departments', form);
      setModal(null); load(); showAlert(editId ? 'Department updated.' : 'Department created.');
    } catch (err) {
      showAlert(err.response?.data?.message || 'Error saving.', 'danger');
    }
  };

  const handleDelete = async d => {
    if (!confirm(`Delete "${d.department_name}"?`)) return;
    try {
      await api.delete(`/departments/${d.department_id}`);
      load(); showAlert('Department deleted.');
    } catch (err) {
      showAlert(err.response?.data?.message || 'Cannot delete.', 'danger');
    }
  };

  const filtered = useMemo(() => {
    if (!search) return depts;
    const q = search.toLowerCase();
    return depts.filter(d => d.department_name?.toLowerCase().includes(q) || d.manager?.toLowerCase().includes(q));
  }, [depts, search]);

  const F = ({ label, name, required }) => (
    <div className="form-group">
      <label className="form-label">{label}{required && <span style={{ color: 'red' }}> *</span>}</label>
      <input className="form-control" value={form[name]} onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))} required={required} />
    </div>
  );

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title"><i className="fas fa-building" style={{ marginRight: 10 }} />Departments</h1>
        <button className="btn btn-primary" onClick={openCreate}><i className="fas fa-plus" />Add Department</button>
      </div>
      {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}
      <div className="card">
        <div className="card-header">
          <h5>Departments ({filtered.length})</h5>
          <input className="form-control" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 240 }} />
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>ID</th><th>Name</th><th>Description</th><th>Manager</th><th>Assets</th><th>Users</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.department_id}>
                    <td>{d.department_id}</td>
                    <td><strong>{d.department_name}</strong></td>
                    <td>{d.description || '—'}</td>
                    <td>{d.manager || '—'}</td>
                    <td><span className="badge badge-info">{d.asset_count}</span></td>
                    <td><span className="badge badge-secondary">{d.user_count}</span></td>
                    <td><span className={`badge ${d.status === 'Active' ? 'badge-success' : 'badge-secondary'}`}>{d.status}</span></td>
                    <td>{fmtDate(d.created_at)}</td>
                    <td>
                      <div className="actions-cell">
                        <button className="btn btn-sm btn-outline btn-icon" onClick={() => openEdit(d)}><i className="fas fa-edit" /></button>
                        <button className="btn btn-sm btn-danger btn-icon" onClick={() => handleDelete(d)}><i className="fas fa-trash" /></button>
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
              <h5>{editId ? 'Edit' : 'Add'} Department</h5>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <F label="Department Name" name="department_name" required />
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-control" rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                </div>
                <div className="form-row form-row-2">
                  <F label="Manager Name" name="manager" />
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-control" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                      <option value="Active">Active</option><option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  <F label="Manager Email" name="manager_email" />
                  <F label="Manager Contact" name="manager_contact" />
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
