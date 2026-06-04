import { useEffect, useState, useMemo } from 'react';
import api from '../api';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' }) : '';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ full_name: '', username: '', password: '', confirm_password: '', department_id: '' });
  const [alert, setAlert] = useState(null);
  const [search, setSearch] = useState('');

  const load = () => {
    api.get('/users').then(r => setUsers(r.data.data));
    api.get('/departments').then(r => setDepartments(r.data.data));
  };
  useEffect(() => { load(); }, []);

  const showAlert = (msg, type = 'success') => { setAlert({ msg, type }); setTimeout(() => setAlert(null), 4000); };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await api.post('/users', form);
      setModal(false);
      setForm({ full_name: '', username: '', password: '', confirm_password: '', department_id: '' });
      load(); showAlert('User created successfully.');
    } catch (err) {
      showAlert(err.response?.data?.message || 'Error creating user.', 'danger');
    }
  };

  const filtered = useMemo(() => {
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter(u => u.full_name?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q) || u.department_name?.toLowerCase().includes(q));
  }, [users, search]);

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title"><i className="fas fa-users" style={{ marginRight: 10 }} />User Management</h1>
        <button className="btn btn-success" onClick={() => setModal(true)}><i className="fas fa-user-plus" />Create New User</button>
      </div>

      {alert && <div className={`alert alert-${alert.type}`}><i className={`fas fa-${alert.type === 'success' ? 'check-circle' : 'exclamation-triangle'}`} />{alert.msg}</div>}

      <div className="card">
        <div className="card-header">
          <h5><i className="fas fa-list" style={{ marginRight: 8 }} />System Users ({filtered.length})</h5>
          <input className="form-control" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 260 }} />
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>ID</th><th>Full Name</th><th>Username</th><th>Role</th><th>Department</th><th>Created</th><th>Updated</th></tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.user_id}>
                    <td>{u.user_id}</td>
                    <td><strong>{u.full_name}</strong></td>
                    <td><span className="text-muted">@</span>{u.username}</td>
                    <td><span className="badge badge-info"><i className="fas fa-user-shield" style={{ marginRight: 4 }} />{u.role}</span></td>
                    <td>{u.department_name || <span className="text-muted">No Department</span>}</td>
                    <td>{fmtDate(u.created_at)}</td>
                    <td>{fmtDate(u.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-box modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h5><i className="fas fa-user-plus" style={{ marginRight: 8 }} />Create New User</h5>
              <button className="modal-close" onClick={() => setModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="alert alert-info"><i className="fas fa-info-circle" /> All new users receive Admin privileges.</div>
                <div className="form-row form-row-2">
                  <div className="form-group">
                    <label className="form-label">Full Name <span style={{ color: 'red' }}>*</span></label>
                    <input className="form-control" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Username <span style={{ color: 'red' }}>*</span></label>
                    <input className="form-control" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} required minLength={3} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password <span style={{ color: 'red' }}>*</span></label>
                    <input type="password" className="form-control" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required minLength={6} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirm Password <span style={{ color: 'red' }}>*</span></label>
                    <input type="password" className="form-control" value={form.confirm_password} onChange={e => setForm(p => ({ ...p, confirm_password: e.target.value }))} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select className="form-control" value={form.department_id} onChange={e => setForm(p => ({ ...p, department_id: e.target.value }))}>
                    <option value="">Select Department (Optional)</option>
                    {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-success"><i className="fas fa-user-plus" />Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
