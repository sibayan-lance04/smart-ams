import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(form.username, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <div style={{
        background: 'white', borderRadius: 20, width: 400,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          color: 'white', padding: '32px 24px', textAlign: 'center',
        }}>
          <i className="fas fa-shield-alt" style={{ fontSize: '3rem', marginBottom: 12 }} />
          <h2 style={{ margin: 0, fontWeight: 700 }}>Asset Management</h2>
          <p style={{ margin: '4px 0 0', opacity: 0.85 }}>System Login</p>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 28 }}>
          {error && (
            <div className="alert alert-danger">
              <i className="fas fa-exclamation-triangle" /> {error}
            </div>
          )}
          <div className="form-group">
            <label className="form-label"><i className="fas fa-user" style={{ marginRight: 6 }} />Username</label>
            <input className="form-control" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label"><i className="fas fa-lock" style={{ marginRight: 6 }} />Password</label>
            <input type="password" className="form-control" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px' }} disabled={loading}>
            {loading ? <><i className="fas fa-spinner fa-spin" /> Logging in...</> : <><i className="fas fa-sign-in-alt" /> Login</>}
          </button>
        </form>
      </div>
    </div>
  );
}
