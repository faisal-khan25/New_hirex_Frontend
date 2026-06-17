import { NavLink } from 'react-router-dom';

export default function AdminLayout({ children }) {
  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-section-label">Admin Panel</div>

        <NavLink
          to="/admin/dashboard"
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          📊 Dashboard
        </NavLink>

      </aside>

      <main className="dashboard-main">
        {children}
      </main>
    </div>
  );
}
