import { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' },
  { path: '/assets', icon: 'fa-boxes', label: 'Assets' },
  { path: '/users', icon: 'fa-users', label: 'Users' },
  { path: '/departments', icon: 'fa-building', label: 'Departments' },
  { path: '/monitoring', icon: 'fa-chart-line', label: 'Monitoring' },
  { path: '/maintenance', icon: 'fa-tools', label: 'Maintenance' },
  { path: '/reports', icon: 'fa-chart-bar', label: 'Reports' },
  { path: '/activity-log', icon: 'fa-history', label: 'Activity Log' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    const handler = e => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex' }}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <i className="fas fa-shield-alt" />
          Asset Management
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.path}
              className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <i className={`fas ${item.icon}`} />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="main-layout">
        <header className="topbar">
          <span className="topbar-title">Smart Asset Management System</span>
          <div className="topbar-user">
            <div className="user-dropdown" ref={dropRef}>
              <button className="user-btn" onClick={() => setDropOpen(v => !v)}>
                <i className="fas fa-user" />
                {user?.fullName}
                <i className="fas fa-chevron-down" style={{ fontSize: '0.7rem' }} />
              </button>
              {dropOpen && (
                <div className="dropdown-menu-custom">
                  <button className="dropdown-item-custom" onClick={() => { navigate('/profile'); setDropOpen(false); }}>
                    <i className="fas fa-user-cog" /> Profile
                  </button>
                  <div className="dropdown-divider" />
                  <button className="dropdown-item-custom" onClick={handleLogout} style={{ color: 'var(--danger)' }}>
                    <i className="fas fa-sign-out-alt" /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
