import { NavLink } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';

// PERF FIX: this layout used to run its own independent 10s polling
// interval against /api/chat/jobseeker/unread-count — duplicating the
// same request already made by NotificationContext (30s) and by
// ManagerLayout's old 15s poll (for managers). All three are now
// consolidated into the single shared NotificationContext.
export default function JobSeekerLayout({ children }) {
  const { unreadCount: unread } = useNotifications();

  return (
    <div className="dashboard-layout">

      {/* SIDEBAR */}
      <aside className="sidebar">

        <div className="sidebar-section-label">Job Seeker</div>

        <NavLink to="/jobseeker/browse" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
          <span>🔍</span><span>Browse Jobs</span>
        </NavLink>

        <NavLink to="/jobseeker/applications" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
          <span>📋</span>
          <span>Applications</span>
          {unread > 0 && <span className="nav-unread-dot">{unread}</span>}
        </NavLink>

        <NavLink to="/jobseeker/profile" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
          <span>👤</span><span>Profile</span>
        </NavLink>

      </aside>

      {/* MAIN CONTENT */}
      <main className="dashboard-main">
        {children}
      </main>

    </div>
  );
}