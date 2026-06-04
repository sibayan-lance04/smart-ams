import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' }) : '';

export default function Profile() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({ full_name: '', username: '', current_password: '', new_password: '', confirm_password: '', department_id: '' });
  const [alert, setAlert] = useState(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [deleteForm, setDeleteForm] = useState({ confirmText: '', understood: false, password: '' });
  const [assetCount, setAssetCount] = useState(0);

  const showAlert = (msg, type = 'success') => { setAlert({ msg, type }); setTimeout(() => setAlert(null), 5000); };

  const load = () => {
    api.get('/users/profile/me').then(r => {
      setUser(r.data.data);
      const u = r.data.data;
      setForm(p => ({ ...p, full_name: u.full_name, username: u.username, department_id: u.department_id || '' }));
    });
    api.get('/departments').then(r => setDepartments(r.data.data));
  };
  useEffect(() => { load(); }, []);

  const handleProfileSubmit = async e => {
    e.preventDefault();
    try {
      await api.put('/users/profile', form);
      load(); showAlert('Profile updated successfully.');
      setForm(p => ({ ...p, current_password: '', new_password: '', confirm_password: '' }));
    } catch (err) { showAlert(err.response?.data?.message || 'Update failed.', 'danger'); }
  };

  const openDeleteModal = async () => {
    const r = await api.get('/users/check-assets');
    setAssetCount(r.data.asset_count);
    setDeleteStep(1); setDeleteForm({ confirmText: '', understood: false, password: '' });
    setDeleteModal(true);
  };

  const handleDeleteAccount = async () => {
    try {
      await api.delete('/users/account', { data: { password: deleteForm.password } });
      await logout(); navigate('/login');
    } catch (err) { showAlert(err.response?.data?.message || 'Delete failed.', 'danger'); setDeleteModal(false); }
  };

  const nextStep = () => {
    if (deleteStep === 1) {
      if (deleteForm.confirmText !== 'I understand the consequences') { alert('Type the confirmation text exactly.'); return; }
      if (!deleteForm.understood) { alert('Check the confirmation box.'); return; }
    }
    if (deleteStep === 2 && !deleteForm.password) { alert('Password is required.'); return; }
    setDeleteStep(s => s + 1);
  };

  if (!user) return <div className="empty-state"><i className="fas fa-spinner fa-spin" /></div>;

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title"><i className="fas fa-user-cog" style={{ marginRight: 10 }} />My Profile</h1>
      </div>

      {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-header"><h5><i className="fas fa-user" style={{ marginRight: 8 }} />Profile Information</h5></div>
          <div className="card-body">
            <form onSubmit={handleProfileSubmit}>
              <div className="form-row form-row-2">
                <div className="form-group">
                  <label className="form-label">Full Name <span style={{ color: 'red' }}>*</span></label>
                  <input className="form-control" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Username <span style={{ color: 'red' }}>*</span></label>
                  <input className="form-control" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select className="form-control" value={form.department_id} onChange={e => setForm(p => ({ ...p, department_id: e.target.value }))}>
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <input className="form-control" value={user.role} readOnly style={{ background: '#f8f9fa' }} />
                </div>
              </div>
              <hr style={{ margin: '16px 0' }} />
              <p style={{ fontWeight: 600, marginBottom: 12 }}>Change Password (Optional)</p>
              <div className="form-row form-row-3">
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <input type="password" className="form-control" value={form.current_password} onChange={e => setForm(p => ({ ...p, current_password: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input type="password" className="form-control" value={form.new_password} onChange={e => setForm(p => ({ ...p, new_password: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input type="password" className="form-control" value={form.confirm_password} onChange={e => setForm(p => ({ ...p, confirm_password: e.target.value }))} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary"><i className="fas fa-save" />Update Profile</button>
            </form>
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-header"><h5><i className="fas fa-info-circle" style={{ marginRight: 8 }} />Account Info</h5></div>
            <div className="card-body">
              {[['User ID', user.user_id], ['Department', user.department_name || 'Not assigned'], ['Created', fmtDate(user.created_at)], ['Last Updated', fmtDate(user.updated_at)]].map(([k, v]) => (
                <div key={k} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#888', textTransform: 'uppercase' }}>{k}</div>
                  <div style={{ fontWeight: 500 }}>{v}</div>
                </div>
              ))}
              <button className="btn btn-danger" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={async () => { await logout(); navigate('/login'); }}>
                <i className="fas fa-sign-out-alt" />Logout
              </button>
            </div>
          </div>

          <div className="card" style={{ border: '2px solid var(--danger)', marginTop: 20 }}>
            <div className="card-header" style={{ background: 'var(--danger)' }}><h5><i className="fas fa-user-times" style={{ marginRight: 8 }} />Danger Zone</h5></div>
            <div className="card-body">
              <div className="alert alert-danger" style={{ fontSize: '0.85rem' }}>
                <strong>Warning:</strong> Deleting your account is permanent and cannot be undone.
              </div>
              <button className="btn btn-danger" style={{ width: '100%', justifyContent: 'center' }} onClick={openDeleteModal}>
                <i className="fas fa-user-times" />Delete My Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {deleteModal && (
        <div className="modal-overlay" onClick={() => setDeleteModal(false)}>
          <div className="modal-box modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ background: 'var(--danger)' }}>
              <h5><i className="fas fa-exclamation-triangle" style={{ marginRight: 8 }} />Delete Account — Step {deleteStep}/3</h5>
              <button className="modal-close" onClick={() => setDeleteModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {deleteStep === 1 && (
                <div>
                  <div className="alert alert-danger"><strong>Final Warning:</strong> This cannot be undone!</div>
                  {assetCount > 0 && <div className="alert alert-warning">You have <strong>{assetCount}</strong> asset(s) assigned. They will be marked as "Unassigned".</div>}
                  <div className="form-group">
                    <label className="form-label">Type exactly: <em>I understand the consequences</em></label>
                    <input className="form-control" value={deleteForm.confirmText} onChange={e => setDeleteForm(p => ({ ...p, confirmText: e.target.value }))} />
                  </div>
                  <label style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
                    <input type="checkbox" checked={deleteForm.understood} onChange={e => setDeleteForm(p => ({ ...p, understood: e.target.checked }))} />
                    I understand this is permanent and cannot be undone
                  </label>
                </div>
              )}
              {deleteStep === 2 && (
                <div>
                  <div className="alert alert-info"><strong>Verify Identity:</strong> Enter your password to confirm.</div>
                  <div className="form-group">
                    <label className="form-label">Current Password</label>
                    <input type="password" className="form-control" value={deleteForm.password} onChange={e => setDeleteForm(p => ({ ...p, password: e.target.value }))} autoFocus />
                  </div>
                </div>
              )}
              {deleteStep === 3 && (
                <div>
                  <div className="alert alert-danger"><strong>Last Chance!</strong> Clicking DELETE will permanently remove your account.</div>
                  <p style={{ textAlign: 'center', fontWeight: 600, color: 'var(--danger)' }}>Are you absolutely sure?</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteModal(false)}>Cancel</button>
              {deleteStep > 1 && <button className="btn btn-secondary" onClick={() => setDeleteStep(s => s - 1)}>Back</button>}
              {deleteStep < 3 && <button className="btn btn-danger" onClick={nextStep}>Next</button>}
              {deleteStep === 3 && <button className="btn btn-danger" onClick={handleDeleteAccount}><i className="fas fa-user-times" />DELETE MY ACCOUNT</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
